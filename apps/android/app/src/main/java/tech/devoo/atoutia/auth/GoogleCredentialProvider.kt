package tech.devoo.atoutia.auth

import android.app.Activity
import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException

interface GoogleCredentialProvider {
    suspend fun requestIdToken(
        activity:
            Activity,

        serverClientId:
            String,
    ): String

    suspend fun clearCredentialState()
}

class GoogleCredentialCancelledException(
    message:
        String,
) : Exception(
    message,
)

class GoogleCredentialUnavailableException(
    message:
        String,
) : Exception(
    message,
)

class GoogleCredentialProtocolException(
    message:
        String,
) : Exception(
    message,
)

class CredentialManagerGoogleCredentialProvider(
    context:
        Context,
) : GoogleCredentialProvider {
    private val credentialManager =
        CredentialManager.create(
            context.applicationContext,
        )

    override suspend fun requestIdToken(
        activity:
            Activity,

        serverClientId:
            String,
    ): String {
        val normalizedClientId =
            normalizeClientId(
                serverClientId,
            )

        val googleOption =
            GetSignInWithGoogleOption
                .Builder(
                    serverClientId =
                        normalizedClientId,
                )
                .build()

        val request =
            GetCredentialRequest
                .Builder()
                .addCredentialOption(
                    googleOption,
                )
                .build()

        val response =
            try {
                credentialManager
                    .getCredential(
                        context =
                            activity,

                        request =
                            request,
                    )
            } catch (
                error:
                    GetCredentialCancellationException,
            ) {
                throw GoogleCredentialCancelledException(
                    "La connexion Google a été annulée.",
                )
            } catch (
                error:
                    NoCredentialException,
            ) {
                throw GoogleCredentialUnavailableException(
                    "Aucun compte Google utilisable n’est disponible sur cet appareil.",
                )
            } catch (
                error:
                    GetCredentialException,
            ) {
                throw GoogleCredentialUnavailableException(
                    error.message
                        ?: "Credential Manager n’a pas pu fournir de compte Google.",
                )
            }

        val credential =
            response.credential

        if (
            credential !is
                CustomCredential
        ) {
            throw GoogleCredentialProtocolException(
                "Credential Manager a retourné un type d’identifiant inattendu.",
            )
        }

        if (
            credential.type !=
            GoogleIdTokenCredential
                .TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            throw GoogleCredentialProtocolException(
                "Credential Manager n’a pas retourné un Google ID Token.",
            )
        }

        val googleCredential =
            try {
                GoogleIdTokenCredential
                    .createFrom(
                        credential.data,
                    )
            } catch (
                error:
                    GoogleIdTokenParsingException,
            ) {
                throw GoogleCredentialProtocolException(
                    "Le Google ID Token retourné est invalide.",
                )
            }

        val idToken =
            googleCredential
                .idToken

        if (
            idToken.isBlank() ||
            idToken !=
            idToken.trim()
        ) {
            throw GoogleCredentialProtocolException(
                "Le Google ID Token retourné est vide ou invalide.",
            )
        }

        return idToken
    }

    override suspend fun clearCredentialState() {
        try {
            credentialManager
                .clearCredentialState(
                    ClearCredentialStateRequest(),
                )
        } catch (
            error:
                ClearCredentialException,
        ) {
            throw GoogleCredentialUnavailableException(
                error.message
                    ?: "Credential Manager n’a pas pu effacer son état de connexion.",
            )
        }
    }

    private companion object {
        fun normalizeClientId(
            value:
                String,
        ): String {
            val trimmed =
                value.trim()

            require(
                trimmed.isNotEmpty(),
            ) {
                "Google server client id must not be empty."
            }

            require(
                value ==
                trimmed,
            ) {
                "Google server client id must not contain surrounding whitespace."
            }

            return trimmed
        }
    }
}