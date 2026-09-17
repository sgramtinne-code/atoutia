package tech.devoo.atoutia.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.GeneralSecurityException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class AndroidSecureAuthTokenStore(
    context:
        Context,
) : AuthTokenStore {
    private val preferences =
        context
            .applicationContext
            .getSharedPreferences(
                PREFERENCES_NAME,
                Context.MODE_PRIVATE,
            )

    override fun save(
        session:
            AuthSessionTokens,
    ) {
        val key =
            getOrCreateSecretKey()

        val accountId =
            encrypt(
                session.accountId,
                key,
            )

        val sessionId =
            encrypt(
                session.sessionId,
                key,
            )

        val accessToken =
            encrypt(
                session.accessToken,
                key,
            )

        val refreshToken =
            encrypt(
                session.refreshToken,
                key,
            )

        val accessExpiresAtMs =
            encrypt(
                session
                    .accessExpiresAtMs
                    .toString(),
                key,
            )

        val saved =
            preferences
                .edit()
                .putString(
                    KEY_ACCOUNT_ID,
                    accountId,
                )
                .putString(
                    KEY_SESSION_ID,
                    sessionId,
                )
                .putString(
                    KEY_ACCESS_TOKEN,
                    accessToken,
                )
                .putString(
                    KEY_REFRESH_TOKEN,
                    refreshToken,
                )
                .putString(
                    KEY_ACCESS_EXPIRES_AT_MS,
                    accessExpiresAtMs,
                )
                .commit()

        check(
            saved,
        ) {
            "Unable to persist Atoutia authentication session."
        }
    }

    override fun load():
        AuthSessionTokens? {
        val accountId =
            preferences.getString(
                KEY_ACCOUNT_ID,
                null,
            )

        val sessionId =
            preferences.getString(
                KEY_SESSION_ID,
                null,
            )

        val accessToken =
            preferences.getString(
                KEY_ACCESS_TOKEN,
                null,
            )

        val refreshToken =
            preferences.getString(
                KEY_REFRESH_TOKEN,
                null,
            )

        val accessExpiresAtMs =
            preferences.getString(
                KEY_ACCESS_EXPIRES_AT_MS,
                null,
            )

        val values =
            listOf(
                accountId,
                sessionId,
                accessToken,
                refreshToken,
                accessExpiresAtMs,
            )

        if (
            values.all {
                it == null
            }
        ) {
            return null
        }

        if (
            values.any {
                it == null
            }
        ) {
            clear()

            return null
        }

        val key =
            try {
                getExistingSecretKey()
            } catch (
                error:
                    GeneralSecurityException,
            ) {
                clear()

                return null
            }

        if (
            key == null
        ) {
            clear()

            return null
        }

        return try {
            val decryptedExpiration =
                decrypt(
                    requireNotNull(
                        accessExpiresAtMs,
                    ),
                    key,
                ).toLongOrNull()

            if (
                decryptedExpiration ==
                    null ||
                decryptedExpiration <
                    0L
            ) {
                clear()

                return null
            }

            AuthSessionTokens(
                accountId =
                    decrypt(
                        requireNotNull(
                            accountId,
                        ),
                        key,
                    ),

                sessionId =
                    decrypt(
                        requireNotNull(
                            sessionId,
                        ),
                        key,
                    ),

                accessToken =
                    decrypt(
                        requireNotNull(
                            accessToken,
                        ),
                        key,
                    ),

                refreshToken =
                    decrypt(
                        requireNotNull(
                            refreshToken,
                        ),
                        key,
                    ),

                accessExpiresAtMs =
                    decryptedExpiration,
            )
        } catch (
            error:
                GeneralSecurityException,
        ) {
            clear()

            null
        } catch (
            error:
                IllegalArgumentException,
        ) {
            clear()

            null
        }
    }

    override fun clear() {
        preferences
            .edit()
            .clear()
            .apply()
    }

    private fun getExistingSecretKey():
        SecretKey? {
        val keyStore =
            KeyStore.getInstance(
                ANDROID_KEY_STORE,
            )

        keyStore.load(
            null,
        )

        return keyStore.getKey(
            KEY_ALIAS,
            null,
        ) as?
            SecretKey
    }

    private fun getOrCreateSecretKey():
        SecretKey {
        val existing =
            getExistingSecretKey()

        if (
            existing != null
        ) {
            return existing
        }

        val keyGenerator =
            KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                ANDROID_KEY_STORE,
            )

        val specification =
            KeyGenParameterSpec
                .Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or
                        KeyProperties.PURPOSE_DECRYPT,
                )
                .setBlockModes(
                    KeyProperties.BLOCK_MODE_GCM,
                )
                .setEncryptionPaddings(
                    KeyProperties.ENCRYPTION_PADDING_NONE,
                )
                .setKeySize(
                    KEY_SIZE_BITS,
                )
                .build()

        keyGenerator.init(
            specification,
        )

        return keyGenerator
            .generateKey()
    }

    private fun encrypt(
        plainText:
            String,

        key:
            SecretKey,
    ): String {
        val cipher =
            Cipher.getInstance(
                TRANSFORMATION,
            )

        cipher.init(
            Cipher.ENCRYPT_MODE,
            key,
        )

        val cipherText =
            cipher.doFinal(
                plainText.toByteArray(
                    StandardCharsets.UTF_8,
                ),
            )

        val encodedIv =
            Base64.encodeToString(
                cipher.iv,
                Base64.NO_WRAP,
            )

        val encodedCipherText =
            Base64.encodeToString(
                cipherText,
                Base64.NO_WRAP,
            )

        return "$encodedIv:$encodedCipherText"
    }

    private fun decrypt(
        payload:
            String,

        key:
            SecretKey,
    ): String {
        val separatorIndex =
            payload.indexOf(
                PAYLOAD_SEPARATOR,
            )

        if (
            separatorIndex <=
                0 ||
            separatorIndex >=
                payload.lastIndex
        ) {
            throw IllegalArgumentException(
                "Invalid encrypted authentication payload.",
            )
        }

        val encodedIv =
            payload.substring(
                0,
                separatorIndex,
            )

        val encodedCipherText =
            payload.substring(
                separatorIndex +
                    1,
            )

        val iv =
            Base64.decode(
                encodedIv,
                Base64.NO_WRAP,
            )

        val cipherText =
            Base64.decode(
                encodedCipherText,
                Base64.NO_WRAP,
            )

        val cipher =
            Cipher.getInstance(
                TRANSFORMATION,
            )

        cipher.init(
            Cipher.DECRYPT_MODE,
            key,
            GCMParameterSpec(
                GCM_TAG_LENGTH_BITS,
                iv,
            ),
        )

        val plainText =
            cipher.doFinal(
                cipherText,
            )

        return String(
            plainText,
            StandardCharsets.UTF_8,
        )
    }

    private companion object {
        const val ANDROID_KEY_STORE =
            "AndroidKeyStore"

        const val KEY_ALIAS =
            "atoutia.auth.tokens.v1"

        const val PREFERENCES_NAME =
            "atoutia_secure_auth_v1"

        const val KEY_ACCOUNT_ID =
            "account_id"

        const val KEY_SESSION_ID =
            "session_id"

        const val KEY_ACCESS_TOKEN =
            "access_token"

        const val KEY_REFRESH_TOKEN =
            "refresh_token"

        const val KEY_ACCESS_EXPIRES_AT_MS =
            "access_expires_at_ms"

        const val TRANSFORMATION =
            "AES/GCM/NoPadding"

        const val KEY_SIZE_BITS =
            256

        const val GCM_TAG_LENGTH_BITS =
            128

        const val PAYLOAD_SEPARATOR =
            ':'
    }
}