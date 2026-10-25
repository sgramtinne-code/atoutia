package tech.devoo.atoutia.security

import android.content.pm.ApplicationInfo
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.xmlpull.v1.XmlPullParser

// Reads packaged manifest/resources only: no account, preferences, backup or restore operation.
@RunWith(AndroidJUnit4::class)
class BackupPolicyInstrumentedTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    private val androidNamespace = "http://schemas.android.com/apk/res/android"
    private val domains = setOf("root", "file", "database", "sharedpref", "external",
        "device_root", "device_file", "device_database", "device_sharedpref")

    @Test fun packagedManifestOptsOutAndReferencesBothRuleFormats() {
        assertFalse(context.applicationInfo.flags and ApplicationInfo.FLAG_ALLOW_BACKUP != 0)
        val policy = manifestPolicy()
        assertFalse(policy.allowBackup)
        assertTrue("Missing legacy fullBackupContent rules", policy.legacy != 0)
        assertTrue("Missing Android 12+ dataExtractionRules", policy.modern != 0)
    }

    @Test fun legacyRulesExcludeEveryStorageDomain() {
        val rules = resourceTree(manifestPolicy().legacy)
        assertEquals("full-backup-content", rules.name)
        assertAllDomainsExcluded(rules)
    }

    @Test fun cloudAndDeviceTransferExcludeEveryStorageDomain() {
        val rules = resourceTree(manifestPolicy().modern)
        assertEquals("data-extraction-rules", rules.name)
        assertEquals(2, rules.children.size)
        assertEquals(setOf("cloud-backup", "device-transfer"), rules.children.map { it.name }.toSet())
        rules.children.forEach(::assertAllDomainsExcluded)
    }

    private fun assertAllDomainsExcluded(section: Tag) {
        assertEquals("Unexpected rule count in ${section.name}", domains.size, section.children.size)
        assertEquals(domains, section.children.map { it.attributes["domain"] }.toSet())
        section.children.forEach {
            assertEquals("Only exclusions are permitted in ${section.name}", "exclude", it.name)
            assertEquals(setOf("domain", "path"), it.attributes.keys)
            assertEquals("Entire storage domain must be excluded", ".", it.attributes["path"])
            assertTrue(it.children.isEmpty())
        }
    }

    private data class ManifestPolicy(val allowBackup: Boolean, val legacy: Int, val modern: Int)

    private fun manifestPolicy(): ManifestPolicy =
        context.assets.openXmlResourceParser("AndroidManifest.xml").use { parser ->
            while (parser.next() != XmlPullParser.END_DOCUMENT) {
                if (parser.eventType == XmlPullParser.START_TAG && parser.name == "application") {
                    return@use ManifestPolicy(
                        parser.getAttributeBooleanValue(androidNamespace, "allowBackup", true),
                        parser.getAttributeResourceValue(androidNamespace, "fullBackupContent", 0),
                        parser.getAttributeResourceValue(androidNamespace, "dataExtractionRules", 0),
                    )
                }
            }
            error("Packaged manifest has no application element")
        }

    private data class Tag(val name: String, val attributes: Map<String, String>, val children: List<Tag>)

    private fun resourceTree(id: Int): Tag {
        assertTrue("Backup rules are not referenced in the packaged manifest", id != 0)
        return context.resources.getXml(id).use { parser ->
            while (parser.next() != XmlPullParser.START_TAG) {
                check(parser.eventType != XmlPullParser.END_DOCUMENT) { "Missing rules root" }
            }
            readTag(parser)
        }
    }

    private fun readTag(parser: XmlPullParser): Tag {
        val name = parser.name
        val attributes = (0 until parser.attributeCount).associate {
            parser.getAttributeName(it) to parser.getAttributeValue(it)
        }
        val children = mutableListOf<Tag>()
        while (parser.next() != XmlPullParser.END_TAG) {
            when (parser.eventType) {
                XmlPullParser.START_TAG -> children.add(readTag(parser))
                XmlPullParser.END_DOCUMENT -> error("Unexpected end of rules")
            }
        }
        return Tag(name, attributes, children)
    }
}
