import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactRole = 'Friend' | 'Relative' | 'Doctor';

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    role: ContactRole;
}

interface ProfileData {
    name: string;
    email: string;
    age: string;
    height: string;
    weight: string;
    address: string;
}

// ─── Mock phone contacts for import ──────────────────────────────────────────

const PHONE_CONTACTS = [
    { id: 'p1', name: 'Alice Johnson', phone: '+91 98765 43210' },
    { id: 'p2', name: 'Bob Martinez',  phone: '+91 91234 56789' },
    { id: 'p3', name: 'Dr. Priya Sharma', phone: '+91 99001 12233' },
    { id: 'p4', name: 'Ravi Kumar',    phone: '+91 87654 32109' },
    { id: 'p5', name: 'Sunita Patel',  phone: '+91 70011 22334' },
    { id: 'p6', name: 'James Wilson',  phone: '+91 80099 88776' },
];

const ROLE_COLORS: Record<ContactRole, { color: string; bg: string }> = {
    Friend:   { color: AppColors.primary,  bg: `${AppColors.primary}15` },
    Relative: { color: AppColors.success,  bg: `${AppColors.success}15` },
    Doctor:   { color: '#7c3aed',          bg: '#ede9fe' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    // Profile
    const [profile, setProfile] = useState<ProfileData>({
        name: 'John Doe',
        email: 'johndoe@example.com',
        age: '34',
        height: '175 cm',
        weight: '72 kg',
        address: '14B, Greenfield Apartments, Chennai, TN 600001',
    });
    const [editField, setEditField] = useState<{ key: keyof ProfileData; label: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    // Emergency contacts
    const [contacts, setContacts] = useState<EmergencyContact[]>([
        { id: '1', name: 'Alice Johnson',   phone: '+91 98765 43210', role: 'Friend' },
        { id: '2', name: 'Ravi Kumar',       phone: '+91 87654 32109', role: 'Relative' },
        { id: '3', name: 'Dr. Priya Sharma', phone: '+91 99001 12233', role: 'Doctor' },
    ]);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [rolePickerContact, setRolePickerContact] = useState<{ id: string; name: string; phone: string } | null>(null);

    // Notifications
    const [notifEmergency, setNotifEmergency]     = useState(true);
    const [notifVitals, setNotifVitals]           = useState(true);
    const [notifDrone, setNotifDrone]             = useState(false);
    const [notifWeeklyReport, setNotifWeeklyReport] = useState(true);

    // Smart ring
    const ringConnected = true;
    const ringName = 'VD SmartRing Pro';
    const ringBattery = 78;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const openEdit = (key: keyof ProfileData, label: string) => {
        setEditField({ key, label });
        setEditValue(profile[key]);
    };

    const saveEdit = () => {
        if (editField) {
            setProfile((p) => ({ ...p, [editField.key]: editValue }));
        }
        setEditField(null);
    };

    const removeContact = (id: string) => {
        Alert.alert('Remove Contact', 'Remove this emergency contact?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => setContacts((c) => c.filter((x) => x.id !== id)) },
        ]);
    };

    const importContact = (contact: { id: string; name: string; phone: string }) => {
        setImportModalVisible(false);
        setRolePickerContact(contact);
    };

    const confirmRole = (role: ContactRole) => {
        if (!rolePickerContact) return;
        const alreadyExists = contacts.some((c) => c.phone === rolePickerContact.phone);
        if (alreadyExists) {
            Alert.alert('Already Added', 'This contact is already in your emergency list.');
            setRolePickerContact(null);
            return;
        }
        setContacts((prev) => [
            ...prev,
            { id: Date.now().toString(), name: rolePickerContact.name, phone: rolePickerContact.phone, role },
        ]);
        setRolePickerContact(null);
    };

    const initials = profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

    const batteryColor = ringBattery > 50 ? AppColors.success : ringBattery > 20 ? AppColors.warning : AppColors.critical;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

                {/* ── Profile Header ─────────────────────────────────────── */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <View style={styles.avatarBadge}>
                            <IconSymbol name="pencil" size={11} color={AppColors.white} />
                        </View>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{profile.name}</Text>
                        <Text style={styles.profileEmail}>{profile.email}</Text>
                    </View>
                </View>

                {/* ── Personal Information ───────────────────────────────── */}
                <SectionHeader title="Personal Information" icon="person.fill" />
                <View style={styles.card}>
                    <InfoRow icon="envelope.fill"   label="Email"   value={profile.email}   onEdit={() => openEdit('email',   'Email')} />
                    <Divider />
                    <InfoRow icon="person.fill"     label="Age"     value={profile.age}     onEdit={() => openEdit('age',     'Age')} />
                    <Divider />
                    <InfoRow icon="ruler"           label="Height"  value={profile.height}  onEdit={() => openEdit('height',  'Height')} />
                    <Divider />
                    <InfoRow icon="scalemass.fill"  label="Weight"  value={profile.weight}  onEdit={() => openEdit('weight',  'Weight')} />
                    <Divider />
                    <InfoRow icon="mappin.fill"     label="Address" value={profile.address} onEdit={() => openEdit('address', 'Address')} last />
                </View>

                {/* ── Emergency Contacts ────────────────────────────────── */}
                <SectionHeader title="Emergency Contacts" icon="shield.fill" />
                <View style={styles.card}>
                    {contacts.map((contact, idx) => {
                        const cfg = ROLE_COLORS[contact.role];
                        return (
                            <React.Fragment key={contact.id}>
                                <View style={styles.contactRow}>
                                    <View style={[styles.contactAvatar, { backgroundColor: cfg.bg }]}>
                                        <Text style={[styles.contactAvatarText, { color: cfg.color }]}>
                                            {contact.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                                        </Text>
                                    </View>
                                    <View style={styles.contactInfo}>
                                        <View style={styles.contactNameRow}>
                                            <Text style={styles.contactName}>{contact.name}</Text>
                                            <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
                                                <Text style={[styles.roleText, { color: cfg.color }]}>{contact.role}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeContact(contact.id)} style={styles.removeBtn} activeOpacity={0.7}>
                                        <IconSymbol name="trash.fill" size={16} color={AppColors.critical} />
                                    </TouchableOpacity>
                                </View>
                                {idx < contacts.length - 1 && <Divider />}
                            </React.Fragment>
                        );
                    })}

                    {contacts.length > 0 && <Divider />}

                    <TouchableOpacity style={styles.importButton} onPress={() => setImportModalVisible(true)} activeOpacity={0.7}>
                        <View style={styles.importIconWrap}>
                            <IconSymbol name="plus.circle.fill" size={18} color={AppColors.primary} />
                        </View>
                        <Text style={styles.importButtonText}>Import from Contacts</Text>
                        <IconSymbol name="chevron.right" size={16} color={AppColors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── Notifications ─────────────────────────────────────── */}
                <SectionHeader title="Notifications" icon="bell.fill" />
                <View style={styles.card}>
                    <NotifRow
                        label="Emergency Alerts"
                        sub="Immediate anomaly and SOS alerts"
                        value={notifEmergency}
                        onChange={setNotifEmergency}
                    />
                    <Divider />
                    <NotifRow
                        label="Vital Warnings"
                        sub="Threshold breaches for vitals"
                        value={notifVitals}
                        onChange={setNotifVitals}
                    />
                    <Divider />
                    <NotifRow
                        label="Drone Status"
                        sub="Dispatch and landing updates"
                        value={notifDrone}
                        onChange={setNotifDrone}
                    />
                    <Divider />
                    <NotifRow
                        label="Weekly Report"
                        sub="Health summary every Monday"
                        value={notifWeeklyReport}
                        onChange={setNotifWeeklyReport}
                        last
                    />
                </View>

                {/* ── Connected Smart Ring ──────────────────────────────── */}
                <SectionHeader title="Connected Device" icon="bluetooth" />
                <View style={styles.card}>
                    <View style={styles.ringRow}>
                        <View style={styles.ringIconWrap}>
                            <View style={styles.ringIconOuter}>
                                <View style={styles.ringIconInner}>
                                    <IconSymbol name="bluetooth" size={14} color={ringConnected ? AppColors.primary : AppColors.disconnected} />
                                </View>
                            </View>
                        </View>
                        <View style={styles.ringInfo}>
                            <Text style={styles.ringName}>{ringName}</Text>
                            <View style={styles.ringStatusRow}>
                                <View style={[styles.ringDot, { backgroundColor: ringConnected ? AppColors.success : AppColors.disconnected }]} />
                                <Text style={[styles.ringStatus, { color: ringConnected ? AppColors.success : AppColors.disconnected }]}>
                                    {ringConnected ? 'Connected' : 'Disconnected'}
                                </Text>
                            </View>
                        </View>
                        {ringConnected && (
                            <View style={styles.ringBatteryBlock}>
                                <View style={styles.ringBatteryTrack}>
                                    <View style={[styles.ringBatteryFill, { width: `${ringBattery}%` as any, backgroundColor: batteryColor }]} />
                                </View>
                                <Text style={[styles.ringBatteryPct, { color: batteryColor }]}>{ringBattery}%</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Logout ────────────────────────────────────────────── */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    activeOpacity={0.8}
                    onPress={() => Alert.alert('Logout', 'Are you sure you want to logout?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Logout', style: 'destructive' },
                    ])}
                >
                    <IconSymbol name="arrow.right.square" size={20} color={AppColors.critical} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>VirtuaDynamics v1.0.0</Text>

            </ScrollView>

            {/* ── Edit Profile Field Modal ───────────────────────────────── */}
            <Modal visible={!!editField} transparent animationType="fade" onRequestClose={() => setEditField(null)}>
                <TouchableWithoutFeedback onPress={() => setEditField(null)}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>
                <View style={styles.editModal}>
                    <Text style={styles.editModalTitle}>Edit {editField?.label}</Text>
                    <TextInput
                        style={styles.editInput}
                        value={editValue}
                        onChangeText={setEditValue}
                        autoFocus
                        placeholderTextColor={AppColors.placeholder}
                    />
                    <View style={styles.editActions}>
                        <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditField(null)} activeOpacity={0.7}>
                            <Text style={styles.editCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editSaveBtn} onPress={saveEdit} activeOpacity={0.7}>
                            <Text style={styles.editSaveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Import Contacts Modal ──────────────────────────────────── */}
            <Modal visible={importModalVisible} transparent animationType="slide" onRequestClose={() => setImportModalVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setImportModalVisible(false)}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>
                <View style={styles.sheetModal}>
                    <View style={styles.sheetHandle} />
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Select Contact</Text>
                        <TouchableOpacity onPress={() => setImportModalVisible(false)} activeOpacity={0.7}>
                            <IconSymbol name="xmark.circle.fill" size={26} color={AppColors.border} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.sheetSub}>Choose a contact to add as emergency contact</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {PHONE_CONTACTS.map((c, idx) => (
                            <React.Fragment key={c.id}>
                                <TouchableOpacity style={styles.phoneContactRow} onPress={() => importContact(c)} activeOpacity={0.7}>
                                    <View style={styles.phoneAvatar}>
                                        <Text style={styles.phoneAvatarText}>
                                            {c.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                                        </Text>
                                    </View>
                                    <View style={styles.phoneContactInfo}>
                                        <Text style={styles.phoneContactName}>{c.name}</Text>
                                        <Text style={styles.phoneContactNumber}>{c.phone}</Text>
                                    </View>
                                    <IconSymbol name="plus.circle.fill" size={22} color={AppColors.primary} />
                                </TouchableOpacity>
                                {idx < PHONE_CONTACTS.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Role Picker Modal ──────────────────────────────────────── */}
            <Modal visible={!!rolePickerContact} transparent animationType="fade" onRequestClose={() => setRolePickerContact(null)}>
                <TouchableWithoutFeedback onPress={() => setRolePickerContact(null)}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>
                <View style={styles.editModal}>
                    <Text style={styles.editModalTitle}>Set Role for</Text>
                    <Text style={styles.rolePickerName}>{rolePickerContact?.name}</Text>
                    <View style={styles.roleOptions}>
                        {(['Friend', 'Relative', 'Doctor'] as ContactRole[]).map((role) => {
                            const cfg = ROLE_COLORS[role];
                            return (
                                <TouchableOpacity
                                    key={role}
                                    style={[styles.roleOptionBtn, { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                                    onPress={() => confirmRole(role)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.roleOptionText, { color: cfg.color }]}>{role}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
    <View style={sectionStyles.row}>
        <IconSymbol name={icon as any} size={15} color={AppColors.primary} />
        <Text style={sectionStyles.text}>{title}</Text>
    </View>
);

const Divider = () => <View style={{ height: 1, backgroundColor: AppColors.border }} />;

const InfoRow = ({
    icon, label, value, onEdit, last,
}: {
    icon: string; label: string; value: string; onEdit: () => void; last?: boolean;
}) => (
    <TouchableOpacity style={[infoStyles.row, last && { paddingBottom: 0 }]} onPress={onEdit} activeOpacity={0.7}>
        <View style={infoStyles.iconWrap}>
            <IconSymbol name={icon as any} size={16} color={AppColors.primary} />
        </View>
        <View style={infoStyles.content}>
            <Text style={infoStyles.label}>{label}</Text>
            <Text style={infoStyles.value} numberOfLines={1}>{value}</Text>
        </View>
        <IconSymbol name="pencil" size={15} color={AppColors.disconnected} />
    </TouchableOpacity>
);

const NotifRow = ({
    label, sub, value, onChange, last,
}: {
    label: string; sub: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) => (
    <View style={[notifStyles.row, last && { paddingBottom: 0 }]}>
        <View style={notifStyles.text}>
            <Text style={notifStyles.label}>{label}</Text>
            <Text style={notifStyles.sub}>{sub}</Text>
        </View>
        <Switch
            value={value}
            onValueChange={onChange}
            trackColor={{ false: AppColors.border, true: `${AppColors.primary}80` }}
            thumbColor={value ? AppColors.primary : AppColors.disconnected}
        />
    </View>
);

// ─── Sub-component styles ─────────────────────────────────────────────────────

const sectionStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10, marginTop: 24, paddingHorizontal: 4 },
    text: { fontSize: 13, fontWeight: '700', color: AppColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
});

const infoStyles = StyleSheet.create({
    row:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    iconWrap:{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${AppColors.primary}10`, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1 },
    label:   { fontSize: 11, color: AppColors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
    value:   { fontSize: 14, color: AppColors.textPrimary, fontWeight: '500' },
});

const notifStyles = StyleSheet.create({
    row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, gap: 12 },
    text:  { flex: 1 },
    label: { fontSize: 15, fontWeight: '600', color: AppColors.textPrimary, marginBottom: 2 },
    sub:   { fontSize: 12, color: AppColors.textSecondary },
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    container: {
        padding: 20,
        paddingBottom: 48,
    },
    // Profile card
    profileCard: {
        backgroundColor: AppColors.surface,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginTop: 4,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 26,
        fontWeight: '800',
        color: AppColors.white,
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: AppColors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: AppColors.surface,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: AppColors.textPrimary,
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 13,
        color: AppColors.textSecondary,
    },
    // Card container
    card: {
        backgroundColor: AppColors.surface,
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
        paddingTop: 2,
        paddingBottom: 16,
    },
    // Emergency contact row
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    contactAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactAvatarText: {
        fontSize: 14,
        fontWeight: '700',
    },
    contactInfo: {
        flex: 1,
    },
    contactNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    contactName: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.textPrimary,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '700',
    },
    contactPhone: {
        fontSize: 12,
        color: AppColors.textSecondary,
    },
    removeBtn: {
        padding: 6,
    },
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
    },
    importIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: `${AppColors.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    importButtonText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.primary,
    },
    // Smart ring
    ringRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 14,
    },
    ringIconWrap: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringIconOuter: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: `${AppColors.primary}30`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringIconInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: `${AppColors.primary}60`,
        backgroundColor: `${AppColors.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringInfo: {
        flex: 1,
    },
    ringName: {
        fontSize: 15,
        fontWeight: '600',
        color: AppColors.textPrimary,
        marginBottom: 4,
    },
    ringStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    ringDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    ringStatus: {
        fontSize: 12,
        fontWeight: '600',
    },
    ringBatteryBlock: {
        alignItems: 'flex-end',
        gap: 4,
    },
    ringBatteryTrack: {
        width: 56,
        height: 5,
        backgroundColor: AppColors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    ringBatteryFill: {
        height: '100%',
        borderRadius: 3,
    },
    ringBatteryPct: {
        fontSize: 11,
        fontWeight: '700',
    },
    // Logout
    logoutButton: {
        marginTop: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: `${AppColors.critical}40`,
        backgroundColor: `${AppColors.critical}08`,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: AppColors.critical,
    },
    versionText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 12,
        color: AppColors.disconnected,
    },
    // Edit modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    editModal: {
        backgroundColor: AppColors.surface,
        marginHorizontal: 28,
        borderRadius: 20,
        padding: 24,
        position: 'absolute',
        top: '35%',
        left: 0,
        right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    editModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: AppColors.textPrimary,
        marginBottom: 16,
    },
    editInput: {
        borderWidth: 1.5,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: AppColors.textPrimary,
        backgroundColor: AppColors.background,
        marginBottom: 20,
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
    },
    editCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        alignItems: 'center',
    },
    editCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.textSecondary,
    },
    editSaveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        alignItems: 'center',
    },
    editSaveText: {
        fontSize: 14,
        fontWeight: '700',
        color: AppColors.white,
    },
    // Import contacts sheet
    sheetModal: {
        backgroundColor: AppColors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        maxHeight: '70%',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AppColors.border,
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: AppColors.textPrimary,
    },
    sheetSub: {
        fontSize: 13,
        color: AppColors.textSecondary,
        marginBottom: 16,
    },
    phoneContactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    phoneAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: `${AppColors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    phoneAvatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: AppColors.primary,
    },
    phoneContactInfo: {
        flex: 1,
    },
    phoneContactName: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.textPrimary,
        marginBottom: 2,
    },
    phoneContactNumber: {
        fontSize: 12,
        color: AppColors.textSecondary,
    },
    // Role picker
    rolePickerName: {
        fontSize: 15,
        fontWeight: '600',
        color: AppColors.primary,
        marginBottom: 20,
    },
    roleOptions: {
        flexDirection: 'row',
        gap: 10,
    },
    roleOptionBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    roleOptionText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
