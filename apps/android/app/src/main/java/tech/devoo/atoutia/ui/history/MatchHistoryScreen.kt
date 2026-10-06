package tech.devoo.atoutia.ui.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.history.MatchHistoryCompletion
import tech.devoo.atoutia.network.history.MatchHistoryEntry
import tech.devoo.atoutia.network.history.MatchHistoryMode
import tech.devoo.atoutia.network.history.MatchHistoryOutcome
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun MatchHistoryScreen(
    state:
        MatchHistoryUiState,

    onRetry:
        () -> Unit,

    onBack:
        () -> Unit,

    modifier:
        Modifier =
            Modifier,
) {
    Scaffold(
        modifier =
            modifier.fillMaxSize(),
    ) { innerPadding ->
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(
                        innerPadding,
                    ),

            contentAlignment =
                Alignment.TopCenter,
        ) {
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .widthIn(
                            max =
                                900.dp,
                        )
                        .padding(
                            horizontal =
                                24.dp,

                            vertical =
                                20.dp,
                        ),

                horizontalAlignment =
                    Alignment.CenterHorizontally,
            ) {
                Text(
                    text =
                        "Historique",

                    style =
                        MaterialTheme
                            .typography
                            .headlineMedium,

                    fontWeight =
                        FontWeight.Bold,
                )

                Text(
                    modifier =
                        Modifier.padding(
                            top =
                                4.dp,
                        ),

                    text =
                        "Tes dernières parties Atoutia.",

                    style =
                        MaterialTheme
                            .typography
                            .bodyLarge,
                )

                when (
                    state
                ) {
                    MatchHistoryUiState.Loading -> {
                        HistoryLoadingContent(
                            modifier =
                                Modifier
                                    .weight(
                                        1f,
                                    )
                                    .fillMaxWidth(),
                        )
                    }

                    is MatchHistoryUiState.Loaded -> {
                        if (
                            state.entries.isEmpty()
                        ) {
                            EmptyHistoryContent(
                                modifier =
                                    Modifier
                                        .weight(
                                            1f,
                                        )
                                        .fillMaxWidth(),
                            )
                        } else {
                            HistoryList(
                                entries =
                                    state.entries,

                                modifier =
                                    Modifier
                                        .weight(
                                            1f,
                                        )
                                        .fillMaxWidth()
                                        .padding(
                                            top =
                                                16.dp,
                                        ),
                            )
                        }
                    }

                    is MatchHistoryUiState.Failed -> {
                        HistoryFailureContent(
                            message =
                                state.message,

                            onRetry =
                                onRetry,

                            modifier =
                                Modifier
                                    .weight(
                                        1f,
                                    )
                                    .fillMaxWidth(),
                        )
                    }
                }

                OutlinedButton(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(
                                top =
                                    12.dp,
                            ),

                    onClick =
                        onBack,
                ) {
                    Text(
                        text =
                            "Retour",
                    )
                }
            }
        }
    }
}

@Composable
private fun HistoryLoadingContent(
    modifier:
        Modifier =
            Modifier,
) {
    Box(
        modifier =
            modifier,

        contentAlignment =
            Alignment.Center,
    ) {
        Column(
            horizontalAlignment =
                Alignment.CenterHorizontally,

            verticalArrangement =
                Arrangement.spacedBy(
                    12.dp,
                ),
        ) {
            CircularProgressIndicator()

            Text(
                text =
                    "Chargement de l’historique…",

                style =
                    MaterialTheme
                        .typography
                        .bodyLarge,
            )
        }
    }
}

@Composable
private fun EmptyHistoryContent(
    modifier:
        Modifier =
            Modifier,
) {
    Box(
        modifier =
            modifier,

        contentAlignment =
            Alignment.Center,
    ) {
        Column(
            horizontalAlignment =
                Alignment.CenterHorizontally,

            verticalArrangement =
                Arrangement.spacedBy(
                    8.dp,
                ),
        ) {
            Text(
                text =
                    "Aucune partie terminée",

                style =
                    MaterialTheme
                        .typography
                        .titleLarge,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )

            Text(
                text =
                    "Tes résultats apparaîtront ici après ta première partie terminée.",

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,

                textAlign =
                    TextAlign.Center,
            )
        }
    }
}

@Composable
private fun HistoryFailureContent(
    message:
        String,

    onRetry:
        () -> Unit,

    modifier:
        Modifier =
            Modifier,
) {
    Box(
        modifier =
            modifier,

        contentAlignment =
            Alignment.Center,
    ) {
        Column(
            horizontalAlignment =
                Alignment.CenterHorizontally,

            verticalArrangement =
                Arrangement.spacedBy(
                    12.dp,
                ),
        ) {
            Text(
                text =
                    "Impossible de charger l’historique.",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )

            Text(
                text =
                    message,

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,

                textAlign =
                    TextAlign.Center,
            )

            OutlinedButton(
                onClick =
                    onRetry,
            ) {
                Text(
                    text =
                        "Réessayer",
                )
            }
        }
    }
}

@Composable
private fun HistoryList(
    entries:
        List<MatchHistoryEntry>,

    modifier:
        Modifier =
            Modifier,
) {
    LazyColumn(
        modifier =
            modifier,

        verticalArrangement =
            Arrangement.spacedBy(
                10.dp,
            ),
    ) {
        items(
            items =
                entries,

            key = {
                entry ->
                entry.sessionId
            },
        ) {
            entry ->
            MatchHistoryCard(
                entry =
                    entry,
            )
        }
    }
}

@Composable
private fun MatchHistoryCard(
    entry:
        MatchHistoryEntry,
) {
    OutlinedCard(
        modifier =
            Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier =
                Modifier.padding(
                    16.dp,
                ),

            verticalArrangement =
                Arrangement.spacedBy(
                    6.dp,
                ),
        ) {
            Text(
                text =
                    outcomeLabel(
                        entry.outcome,
                    ),

                style =
                    MaterialTheme
                        .typography
                        .titleLarge,

                fontWeight =
                    FontWeight.Bold,
            )

            Text(
                text =
                    modeLabel(
                        entry.mode,
                    ),

                style =
                    MaterialTheme
                        .typography
                        .labelLarge,
            )

            when (
                entry.completion
            ) {
                MatchHistoryCompletion.NORMAL -> {
                    val score =
                        requireNotNull(
                            entry.score,
                        )

                    Text(
                        text =
                            "${score.ownTeam} – ${score.opponentTeam}",

                        style =
                            MaterialTheme
                                .typography
                                .headlineSmall,

                        fontWeight =
                            FontWeight.SemiBold,
                    )

                    Text(
                        text =
                            "Objectif : ${score.targetScore} points",

                        style =
                            MaterialTheme
                                .typography
                                .bodyMedium,
                    )
                }

                MatchHistoryCompletion.FORFEIT -> {
                    Text(
                        text =
                            forfeitLabel(
                                entry,
                            ),

                        style =
                            MaterialTheme
                                .typography
                                .bodyLarge,

                        fontWeight =
                            FontWeight.SemiBold,
                    )
                }
            }

            Text(
                text =
                    formatCompletedAt(
                        entry.completedAtMs,
                    ),

                style =
                    MaterialTheme
                        .typography
                        .bodySmall,
            )
        }
    }
}

private fun outcomeLabel(
    outcome:
        MatchHistoryOutcome,
): String =
    when (
        outcome
    ) {
        MatchHistoryOutcome.WIN ->
            "Victoire"

        MatchHistoryOutcome.LOSS ->
            "Défaite"
    }

private fun modeLabel(
    mode:
        MatchHistoryMode,
): String =
    when (
        mode
    ) {
        MatchHistoryMode.PRIVATE ->
            "Partie privée"

        MatchHistoryMode.CASUAL ->
            "Partie amicale"

        MatchHistoryMode.RANKED ->
            "Partie classée"
    }

private fun forfeitLabel(
    entry:
        MatchHistoryEntry,
): String {
    val forfeit =
        requireNotNull(
            entry.forfeit,
        )

    return when {
        forfeit.bySelf ->
            "Défaite par forfait personnel"

        forfeit.byOwnTeam ->
            "Défaite par forfait de ton équipe"

        else ->
            "Victoire par forfait adverse"
    }
}

private fun formatCompletedAt(
    completedAtMs:
        Long,
): String {
    val formatter =
        SimpleDateFormat(
            "dd/MM/yyyy HH:mm",
            Locale.forLanguageTag(
                "fr-BE",
            ),
        )

    return formatter.format(
        Date(
            completedAtMs,
        ),
    )
}
