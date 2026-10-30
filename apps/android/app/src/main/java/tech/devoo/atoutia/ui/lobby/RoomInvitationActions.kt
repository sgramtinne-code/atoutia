package tech.devoo.atoutia.ui.lobby

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PersistableBundle
import tech.devoo.atoutia.network.room.RoomInvitation

/** Called only after a user's copy, paste or share action. */
internal object RoomInvitationActions {
    fun copy(context: Context, text: String) {
        require(RoomInvitation.parse(text) != null)
        val clip = ClipData.newPlainText("Invitation Atoutia", text)
        if (Build.VERSION.SDK_INT >= 33) clip.description.extras = PersistableBundle().apply {
            putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
        }
        context.getSystemService(ClipboardManager::class.java).setPrimaryClip(clip)
    }

    fun read(context: Context): String? {
        val clip = context.getSystemService(ClipboardManager::class.java).primaryClip ?: return null
        if (clip.itemCount != 1) return null
        // Do not coerce URIs/Intents: pasting an invitation must never fetch external data.
        return clip.getItemAt(0).text?.toString()?.let(RoomInvitation::parse)
    }

    fun shareIntent(text: String): Intent {
        require(RoomInvitation.parse(text) != null)
        return Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
    }

    fun share(context: Context, text: String) {
        context.startActivity(Intent.createChooser(shareIntent(text), "Inviter à cette partie"))
    }
}
