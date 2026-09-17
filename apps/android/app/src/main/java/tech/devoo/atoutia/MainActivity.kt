package tech.devoo.atoutia

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.ui.theme.AtoutiaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(
        savedInstanceState: Bundle?,
    ) {
        super.onCreate(
            savedInstanceState,
        )

        enableEdgeToEdge()

        setContent {
            AtoutiaTheme {
                AtoutiaApp()
            }
        }
    }
}

@Composable
private fun AtoutiaApp() {
    Scaffold(
        modifier =
            Modifier.fillMaxSize(),
    ) { innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(
                        innerPadding,
                    )
                    .padding(
                        horizontal =
                            24.dp,
                    ),

            verticalArrangement =
                Arrangement.Center,

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            Text(
                text =
                    "Atoutia",

                style =
                    MaterialTheme
                        .typography
                        .displayMedium,

                fontWeight =
                    FontWeight.Bold,
            )

            Text(
                modifier =
                    Modifier.padding(
                        top =
                            12.dp,
                    ),

                text =
                    "La Belote moderne.",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,
            )

            Text(
                modifier =
                    Modifier.padding(
                        top =
                            32.dp,
                    ),

                text =
                    "Fondation Android prête",

                style =
                    MaterialTheme
                        .typography
                        .bodyLarge,
            )
        }
    }
}

@Preview(
    showBackground =
        true,
)
@Composable
private fun AtoutiaAppPreview() {
    AtoutiaTheme {
        AtoutiaApp()
    }
}