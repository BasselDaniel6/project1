from __future__ import annotations

"""Helpers for the lineup summary API."""

import json
from itertools import combinations
from pathlib import Path
from typing import Any

from app.dbmodels.models import Player, Possession

SAMPLE_SUMMARY_DATA_PATH = Path(__file__).resolve().parent / 'sample_summary_data' / 'sample_summary_data.json'
LineupRecord = dict[str, Any]


def _normalize_lineup_size(lineup_size: Any) -> int:
    try:
        normalized_lineup_size = int(lineup_size)
    except (TypeError, ValueError):
        return 5

    return max(1, min(5, normalized_lineup_size))


def _load_sample_lineups() -> list[LineupRecord]:
    with open(SAMPLE_SUMMARY_DATA_PATH) as sample_summary_data_file:
        return json.load(sample_summary_data_file)


def _truncate_sample_lineup(lineup: LineupRecord, lineup_size: int) -> LineupRecord:
    truncated_lineup = dict(lineup)
    truncated_lineup['player_ids'] = lineup['player_ids'][:lineup_size]
    truncated_lineup['players'] = lineup['players'][:lineup_size]
    return truncated_lineup


def _get_sample_lineups(lineup_size: int = 5) -> list[LineupRecord]:
    normalized_lineup_size = _normalize_lineup_size(lineup_size)
    return [
        _truncate_sample_lineup(lineup, normalized_lineup_size)
        for lineup in _load_sample_lineups()
    ]


def _safe_divide(numerator: int | float, denominator: int | float) -> float:
    return numerator / denominator if denominator else 0.0


def get_lineup_league_summary_stats(
    lineup_size: int = 5,
    min_possessions: int = 0,
    sort_by: str = 'total_possessions',
    sort_order: str = 'desc',
    limit: int | None = None,
) -> list[LineupRecord]:
    """Aggregate n-player lineup performance across all possessions.

    Besides the sample response fields, each row includes efficiency, shooting,
    turnover, and rebounding metrics. Results can be filtered and sorted for
    common coaching and analysis use cases.
    """
    size = _normalize_lineup_size(lineup_size)
    counting_fields = (
        'points', 'shot_attempts', 'fg2_made', 'fg2_attempted',
        'fg3_made', 'fg3_attempted', 'fg_made', 'fg_attempted',
        'ft_made', 'ft_attempted', 'rebounds_offense', 'rebounds_defense',
        'rebound_opportunities', 'assists', 'steals', 'turnovers',
        'blocks', 'offensive_fouls', 'defensive_fouls', 'shooting_fouls',
        'shot_attempt_points', 'ft_potential_points', 'transition_take_fouls',
    )
    summaries: dict[tuple[str, tuple[str, ...]], dict[str, Any]] = {}

    def get_summary(team_id: Any, player_ids: tuple[str, ...]) -> dict[str, Any]:
        key = (str(team_id), player_ids)
        if key not in summaries:
            summaries[key] = {
                'team_id': str(team_id),
                'player_ids': list(player_ids),
                'offensive_possessions': 0,
                'defensive_possessions': 0,
                **{f'{role}_{field}': 0 for role in ('offensive', 'defensive') for field in counting_fields},
            }
        return summaries[key]

    # Iterate over values instead of modeling instances.
    # This keeps the endpoint portable and avoids loading unrelated columns for the large possession set.
    possession_fields = (
        'offensive_team_id', 'defensive_team_id',
        'offensive_player_ids', 'defensive_player_ids', *counting_fields,
    )
    for possession in Possession.objects.values(*possession_fields).iterator():
        for role, team_key, players_key in (
            ('offensive', 'offensive_team_id', 'offensive_player_ids'),
            ('defensive', 'defensive_team_id', 'defensive_player_ids'),
        ):
            players = tuple(sorted(str(player_id) for player_id in possession[players_key]))
            for lineup in combinations(players, size):
                summary = get_summary(possession[team_key], lineup)
                summary[f'{role}_possessions'] += 1
                for field in counting_fields:
                    summary[f'{role}_{field}'] += possession[field] or 0

    names = {
        str(player['id']): player['name']
        for player in Player.objects.values('id', 'name')
    }
    output = []
    for summary in summaries.values():
        summary['total_possessions'] = summary['offensive_possessions'] + summary['defensive_possessions']
        summary['players'] = [
            {'player_id': player_id, 'name': names.get(player_id, player_id)}
            for player_id in summary['player_ids']
        ]
        for role in ('offensive', 'defensive'):
            attempts = summary[f'{role}_fg_attempted']
            summary[f'{role}_fg_pct'] = _safe_divide(summary[f'{role}_fg_made'], attempts)
            for shot_type in ('fg2', 'fg3'):
                attempts = summary[f'{role}_{shot_type}_attempted']
                summary[f'{role}_{shot_type}_pct'] = _safe_divide(
                    summary[f'{role}_{shot_type}_made'], attempts,
                )

        offensive_possessions = summary['offensive_possessions']
        defensive_possessions = summary['defensive_possessions']
        summary['offensive_rating'] = 100 * _safe_divide(
            summary['offensive_points'], offensive_possessions,
        )
        summary['defensive_rating'] = 100 * _safe_divide(
            summary['defensive_points'], defensive_possessions,
        )
        summary['net_rating'] = summary['offensive_rating'] - summary['defensive_rating']
        summary['offensive_effective_fg_pct'] = _safe_divide(
            summary['offensive_fg_made'] + 0.5 * summary['offensive_fg3_made'],
            summary['offensive_fg_attempted'],
        )
        summary['defensive_effective_fg_pct'] = _safe_divide(
            summary['defensive_fg_made'] + 0.5 * summary['defensive_fg3_made'],
            summary['defensive_fg_attempted'],
        )
        summary['offensive_turnover_pct'] = _safe_divide(
            summary['offensive_turnovers'], offensive_possessions,
        )
        summary['assist_to_turnover_ratio'] = _safe_divide(
            summary['offensive_assists'], summary['offensive_turnovers'],
        )
        summary['offensive_rebound_pct'] = _safe_divide(
            summary['offensive_rebounds_offense'],
            summary['offensive_rebound_opportunities'],
        )
        summary['defensive_rebound_pct'] = _safe_divide(
            summary['defensive_rebounds_defense'],
            summary['defensive_rebound_opportunities'],
        )
        output.append(summary)

    try:
        minimum = max(0, int(min_possessions))
    except (TypeError, ValueError):
        minimum = 0
    output = [row for row in output if row['total_possessions'] >= minimum]

    sortable_metrics = {
        'total_possessions', 'offensive_possessions', 'defensive_possessions',
        'offensive_rating', 'defensive_rating', 'net_rating',
        'offensive_effective_fg_pct', 'defensive_effective_fg_pct',
        'offensive_turnover_pct', 'assist_to_turnover_ratio',
        'offensive_rebound_pct', 'defensive_rebound_pct',
    }
    metric = sort_by if sort_by in sortable_metrics else 'total_possessions'
    reverse = str(sort_order).lower() != 'asc'
    output.sort(key=lambda row: (row[metric], row['team_id'], row['player_ids']), reverse=reverse)

    if limit is not None:
        try:
            output = output[:max(1, min(5000, int(limit)))]
        except (TypeError, ValueError):
            pass
    return output
