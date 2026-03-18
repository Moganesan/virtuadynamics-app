import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { externalProfileService, getVirtuaLoginAuth, settingsService } from '@/services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const parseDateString = (str: string): Date | null => {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) return d;
    }
    return null;
};

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
    phone: string;
    dateOfBirth: string;
    height: string;
    weight: string;
    address: string;
}

type ProfileKey = keyof ProfileData;

// Fields managed by VirtuaLogin external API
const EXTERNAL_FIELDS: ProfileKey[] = ['name', 'phone', 'dateOfBirth', 'address'];
// Fields managed by local backend
const LOCAL_FIELDS: ProfileKey[] = ['height', 'weight'];

interface PhoneContact {
    id: string;
    name: string;
    phone: string;
}

const ROLE_COLORS: Record<ContactRole, { color: string; bg: string }> = {
    Friend:   { color: AppColors.primary,  bg: `${AppColors.primary}15` },
    Relative: { color: AppColors.success,  bg: `${AppColors.success}15` },
    Doctor:   { color: '#7c3aed',          bg: '#ede9fe' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    const { user, localToken, logout, updateUser } = useAuth();

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to logout?')) {
                await logout();
            }
        } else {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]);
        }
    };

    // Derive display name from the external API response
    const primaryProfile = user?.user_profiles?.[0];
    const firstName = primaryProfile?.first_name || user?.first_name || '';
    const lastName = primaryProfile?.last_name || user?.last_name || '';
    const fullName = firstName
        ? `${firstName}${lastName ? ' ' + lastName : ''}`
        : (user?.username || '');

    // Profile — external fields from user object, local fields loaded from backend
    const [profile, setProfile] = useState<ProfileData>({
        name: fullName,
        email: user?.email || '',
        phone: primaryProfile?.phone || user?.phone || '',
        dateOfBirth: primaryProfile?.date_of_birth || user?.date_of_birth || '',
        height: '',
        weight: '',
        address: primaryProfile?.home_address || '',
    });
    const [editField, setEditField] = useState<{ key: ProfileKey; label: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editDateValue, setEditDateValue] = useState<Date>(new Date(2000, 0, 1));
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);

    // Emergency contacts
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [rolePickerContact, setRolePickerContact] = useState<{ id: string; name: string; phone: string } | null>(null);

    // Notifications
    const [notifEmergency, setNotifEmergency]     = useState(true);
    const [notifVitals, setNotifVitals]           = useState(true);
    const [notifDrone, setNotifDrone]             = useState(false);
    const [notifWeeklyReport, setNotifWeeklyReport] = useState(true);

    // Smart ring / connected device
    const [device, setDevice] = useState({ name: 'VD SmartRing Pro', battery: 78, connected: false });

    // ── Sync external profile data when user changes ────────────────────────
    useEffect(() => {
        if (!user) return;
        const pp = user.user_profiles?.[0];
        const fn = pp?.first_name || user.first_name || '';
        const ln = pp?.last_name || user.last_name || '';
        setProfile((prev) => ({
            ...prev,
            name: fn ? `${fn}${ln ? ' ' + ln : ''}` : (user.username || ''),
            email: user.email || '',
            phone: pp?.phone || user.phone || '',
            dateOfBirth: pp?.date_of_birth || user.date_of_birth || '',
            address: pp?.home_address || '',
        }));
    }, [user]);

    // ── Load local health data + contacts/notifications/devices ─────────────
    useEffect(() => {
        if (!localToken) return;

        // Health data (height, weight) from local backend
        console.debug('[DEBUG][Settings] Fetching health data...');
        settingsService.getHealthData(localToken)
            .then((res) => {
                console.debug('[DEBUG][Settings] Health data response:', JSON.stringify(res));
                if (res.user?.profile) {
                    const p = res.user.profile;
                    setProfile((prev) => ({
                        ...prev,
                        height:  p.height  || '',
                        weight:  p.weight  || '',
                    }));
                }
            })
            .catch((err) => { console.error('[DEBUG][Settings] Health data fetch error:', err); });

        // Emergency contacts
        console.debug('[DEBUG][Settings] Fetching contacts...');
        settingsService.getContacts(localToken)
            .then((res) => {
                console.debug('[DEBUG][Settings] Contacts response:', JSON.stringify(res));
                if (res.data) setContacts(res.data);
            })
            .catch((err) => { console.error('[DEBUG][Settings] Contacts fetch error:', err); });

        // Notification settings
        console.debug('[DEBUG][Settings] Fetching notifications...');
        settingsService.getNotifications(localToken)
            .then((res) => {
                console.debug('[DEBUG][Settings] Notifications response:', JSON.stringify(res));
                if (res.data) {
                    setNotifEmergency(res.data.emergencyAlerts);
                    setNotifVitals(res.data.vitalWarnings);
                    setNotifDrone(res.data.droneStatusUpdates);
                    setNotifWeeklyReport(res.data.weeklyHealthReports);
                }
            })
            .catch((err) => { console.error('[DEBUG][Settings] Notifications fetch error:', err); });

        // Connected devices
        console.debug('[DEBUG][Settings] Fetching devices...');
        settingsService.getDevices(localToken)
            .then((res) => {
                console.debug('[DEBUG][Settings] Devices response:', JSON.stringify(res));
                const connected = res.data?.find((d: any) => d.status === 'connected');
                if (connected) {
                    setDevice({ name: connected.name, battery: connected.battery, connected: true });
                }
            })
            .catch((err) => { console.error('[DEBUG][Settings] Devices fetch error:', err); });
    }, [localToken]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const openEdit = (key: ProfileKey, label: string) => {
        if (key === 'email') return; // email is read-only (managed by external service)
        setEditField({ key, label });
        setEditValue(profile[key]);
        if (key === 'dateOfBirth') {
            const parsed = parseDateString(profile[key]);
            setEditDateValue(parsed || new Date(2000, 0, 1));
            setShowEditDatePicker(Platform.OS === 'ios');
        }
    };

    const saveEdit = async () => {
        if (!editField) return;
        const key = editField.key;
        const value = editValue;

        // Optimistic UI update
        setProfile((p) => ({ ...p, [key]: value }));

        if (LOCAL_FIELDS.includes(key) && localToken) {
            // Save height/weight to local backend
            console.debug(`[DEBUG][Settings] Updating health data: ${key}=${value}`);
            settingsService.updateHealthData({ [key]: value }, localToken).catch((err) => {
                console.error('[DEBUG][Settings] Health data update error:', err);
            });
        } else if (EXTERNAL_FIELDS.includes(key) && user) {
            // Save to VirtuaLogin external API
            const auth = getVirtuaLoginAuth(user);
            const pp = user.user_profiles?.[0];

            // Current name parts (may be overridden if editing 'name')
            let fn = pp?.first_name || user.first_name || '';
            let ln = pp?.last_name || user.last_name || '';

            if (key === 'name') {
                const parts = value.trim().split(/\s+/);
                fn = parts[0] || '';
                ln = parts.slice(1).join(' ') || '';
            }

            try {
                if (!pp?.profile_id) {
                    // No profile exists — create one via VirtuaLogin
                    const createData: {
                        first_name: string;
                        last_name: string;
                        phone?: string;
                        date_of_birth?: string;
                        home_address?: string;
                    } = { first_name: fn, last_name: ln };
                    if (key === 'phone') createData.phone = value;
                    else if (profile.phone) createData.phone = profile.phone;
                    if (key === 'dateOfBirth') createData.date_of_birth = value;
                    else if (profile.dateOfBirth) createData.date_of_birth = profile.dateOfBirth;
                    if (key === 'address') createData.home_address = value;
                    else if (profile.address) createData.home_address = profile.address;

                    console.debug('[DEBUG][Settings] Creating external profile:', JSON.stringify(createData));
                    const createRes = await externalProfileService.createProfile(createData, auth);
                    console.debug('[DEBUG][Settings] Create profile response:', JSON.stringify(createRes));
                    if (createRes.error) throw new Error(createRes.message || 'Failed to create profile');

                    const newProfile = createRes.data?.user_profiles?.[0] || createRes.data;
                    const userUpdates: Record<string, any> = { first_name: fn, last_name: ln };
                    userUpdates.user_profiles = [newProfile || { first_name: fn, last_name: ln }];
                    await updateUser(userUpdates);
                } else {
                    // Profile exists — update it
                    const updateData: {
                        profile_id: string;
                        first_name: string;
                        last_name: string;
                        phone?: string;
                        date_of_birth?: string;
                        home_address?: string;
                    } = {
                        profile_id: String(pp.profile_id),
                        first_name: fn,
                        last_name: ln,
                    };
                    if (key === 'phone') updateData.phone = value;
                    if (key === 'dateOfBirth') updateData.date_of_birth = value;
                    if (key === 'address') updateData.home_address = value;

                    console.debug('[DEBUG][Settings] Updating external profile:', JSON.stringify(updateData));
                    const updateRes = await externalProfileService.updateProfile(updateData, auth);
                    console.debug('[DEBUG][Settings] Update profile response:', JSON.stringify(updateRes));
                    if (updateRes.error) throw new Error(updateRes.message || 'Failed to update profile');

                    // Sync changes back to local AuthContext user state
                    const userUpdates: Record<string, any> = {};
                    if (key === 'name') {
                        userUpdates.first_name = fn;
                        userUpdates.last_name = ln;
                    }
                    const updatedProfile = { ...pp };
                    if (key === 'name') {
                        updatedProfile.first_name = fn;
                        updatedProfile.last_name = ln;
                    }
                    if (key === 'phone') updatedProfile.phone = value;
                    if (key === 'dateOfBirth') updatedProfile.date_of_birth = value;
                    if (key === 'address') updatedProfile.home_address = value;
                    userUpdates.user_profiles = [updatedProfile, ...(user.user_profiles?.slice(1) || [])];
                    await updateUser(userUpdates);
                }
            } catch (e: any) {
                // Revert optimistic update on error
                console.error('[DEBUG][Settings] Profile update error:', e);
                setProfile((p) => ({ ...p, [key]: profile[key] }));
                Alert.alert('Error', e.message || 'Failed to update profile');
            }
        }

        setEditField(null);
    };

    const removeContact = (id: string) => {
        const doRemove = () => {
            setContacts((c) => c.filter((x) => x.id !== id));
            if (localToken) {
                console.debug(`[DEBUG][Settings] Deleting contact id=${id}`);
                settingsService.deleteContact(id, localToken).catch((err) => {
                    console.error('[DEBUG][Settings] Delete contact error:', err);
                });
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Remove this emergency contact?')) {
                doRemove();
            }
        } else {
            Alert.alert('Remove Contact', 'Remove this emergency contact?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: doRemove },
            ]);
        }
    };

    const loadDeviceContacts = async () => {
        setContactsLoading(true);
        setContactSearch('');
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Access to contacts was denied. Please enable it in your device settings.');
                setImportModalVisible(false);
                setContactsLoading(false);
                return;
            }
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
                sort: Contacts.SortTypes.FirstName,
            });
            const mapped: PhoneContact[] = [];
            for (const c of data) {
                const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim();
                const phone = c.phoneNumbers?.[0]?.number;
                if (name && phone) {
                    mapped.push({ id: c.id ?? String(mapped.length), name, phone });
                }
            }
            setPhoneContacts(mapped);
        } catch (e: any) {
            console.error('[DEBUG][Settings] Load contacts error:', e);
            Alert.alert('Error', 'Failed to load contacts from your device.');
        } finally {
            setContactsLoading(false);
        }
    };

    const openImportModal = () => {
        setImportModalVisible(true);
        loadDeviceContacts();
    };

    const importContact = (contact: PhoneContact) => {
        setImportModalVisible(false);
        setRolePickerContact(contact);
    };

    const confirmRole = async (role: ContactRole) => {
        if (!rolePickerContact) return;
        const alreadyExists = contacts.some((c) => c.phone === rolePickerContact.phone);
        if (alreadyExists) {
            Alert.alert('Already Added', 'This contact is already in your emergency list.');
            setRolePickerContact(null);
            return;
        }
        if (localToken) {
            try {
                console.debug(`[DEBUG][Settings] Adding contact: ${rolePickerContact.name}, role=${role}`);
                const res = await settingsService.addContact(
                    { name: rolePickerContact.name, phone: rolePickerContact.phone, role },
                    localToken,
                );
                console.debug('[DEBUG][Settings] Add contact response:', JSON.stringify(res));
                setContacts((prev) => [...prev, res.data]);
            } catch (e: any) {
                console.error('[DEBUG][Settings] Add contact error:', e);
                Alert.alert('Error', e.message || 'Failed to add contact');
            }
        } else {
            setContacts((prev) => [
                ...prev,
                { id: Date.now().toString(), name: rolePickerContact.name, phone: rolePickerContact.phone, role },
            ]);
        }
        setRolePickerContact(null);
    };

    const handleNotifChange = (key: string, setter: (v: boolean) => void, value: boolean) => {
        console.debug(`[DEBUG][Settings] Updating notification: ${key}=${value}`);
        setter(value);
        if (localToken) {
            settingsService.updateNotificationSetting(key, value, localToken).catch((err) => {
                console.error(`[DEBUG][Settings] Notification update error (${key}):`, err);
            });
        }
    };

    const initials = profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

    const batteryColor = device.battery > 50 ? AppColors.success : device.battery > 20 ? AppColors.warning : AppColors.critical;

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
                    <InfoRow icon="envelope.fill"       label="Email"          value={profile.email}       onEdit={() => openEdit('email', 'Email')} readOnly />
                    <Divider />
                    <InfoRow icon="person.fill"          label="Name"           value={profile.name}        onEdit={() => openEdit('name', 'Name')} />
                    <Divider />
                    <InfoRow icon="phone.fill"           label="Phone"          value={profile.phone}       onEdit={() => openEdit('phone', 'Phone')} />
                    <Divider />
                    <InfoRow icon="calendar"             label="Date of Birth"  value={profile.dateOfBirth} onEdit={() => openEdit('dateOfBirth', 'Date of Birth')} />
                    <Divider />
                    <InfoRow icon="ruler"                label="Height"         value={profile.height}      onEdit={() => openEdit('height', 'Height')} />
                    <Divider />
                    <InfoRow icon="scalemass.fill"       label="Weight"         value={profile.weight}      onEdit={() => openEdit('weight', 'Weight')} />
                    <Divider />
                    <InfoRow icon="mappin.fill"          label="Address"        value={profile.address}     onEdit={() => openEdit('address', 'Address')} last />
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

                    <TouchableOpacity style={styles.importButton} onPress={openImportModal} activeOpacity={0.7}>
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
                        onChange={(v) => handleNotifChange('emergencyAlerts', setNotifEmergency, v)}
                    />
                    <Divider />
                    <NotifRow
                        label="Vital Warnings"
                        sub="Threshold breaches for vitals"
                        value={notifVitals}
                        onChange={(v) => handleNotifChange('vitalWarnings', setNotifVitals, v)}
                    />
                    <Divider />
                    <NotifRow
                        label="Drone Status"
                        sub="Dispatch and landing updates"
                        value={notifDrone}
                        onChange={(v) => handleNotifChange('droneStatusUpdates', setNotifDrone, v)}
                    />
                    <Divider />
                    <NotifRow
                        label="Weekly Report"
                        sub="Health summary every Monday"
                        value={notifWeeklyReport}
                        onChange={(v) => handleNotifChange('weeklyHealthReports', setNotifWeeklyReport, v)}
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
                                    <IconSymbol name="bluetooth" size={14} color={device.connected ? AppColors.primary : AppColors.disconnected} />
                                </View>
                            </View>
                        </View>
                        <View style={styles.ringInfo}>
                            <Text style={styles.ringName}>{device.name}</Text>
                            <View style={styles.ringStatusRow}>
                                <View style={[styles.ringDot, { backgroundColor: device.connected ? AppColors.success : AppColors.disconnected }]} />
                                <Text style={[styles.ringStatus, { color: device.connected ? AppColors.success : AppColors.disconnected }]}>
                                    {device.connected ? 'Connected' : 'Disconnected'}
                                </Text>
                            </View>
                        </View>
                        {device.connected && (
                            <View style={styles.ringBatteryBlock}>
                                <View style={styles.ringBatteryTrack}>
                                    <View style={[styles.ringBatteryFill, { width: `${device.battery}%` as any, backgroundColor: batteryColor }]} />
                                </View>
                                <Text style={[styles.ringBatteryPct, { color: batteryColor }]}>{device.battery}%</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Logout ────────────────────────────────────────────── */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    activeOpacity={0.8}
                    onPress={handleLogout}
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
                    {editField?.key === 'dateOfBirth' ? (
                        Platform.OS === 'web' ? (
                            <input
                                type="date"
                                value={editValue}
                                max={formatDate(new Date())}
                                onChange={(e) => {
                                    const val = (e.target as HTMLInputElement).value;
                                    setEditValue(val);
                                    if (val) {
                                        const parts = val.split('-');
                                        setEditDateValue(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
                                    }
                                }}
                                style={{
                                    borderWidth: 1.5,
                                    borderStyle: 'solid',
                                    borderColor: AppColors.border,
                                    borderRadius: 12,
                                    paddingLeft: 14,
                                    paddingRight: 14,
                                    paddingTop: 12,
                                    paddingBottom: 12,
                                    fontSize: 15,
                                    color: AppColors.textPrimary,
                                    backgroundColor: AppColors.background,
                                    marginBottom: 20,
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    width: '100%',
                                    boxSizing: 'border-box' as const,
                                }}
                            />
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={styles.editInput}
                                    onPress={() => setShowEditDatePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{ fontSize: 15, color: editValue ? AppColors.textPrimary : AppColors.placeholder }}>
                                        {editValue || 'Select date of birth'}
                                    </Text>
                                </TouchableOpacity>
                                {showEditDatePicker && (
                                    <DateTimePicker
                                        value={editDateValue}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        maximumDate={new Date()}
                                        onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                                            if (Platform.OS === 'android') setShowEditDatePicker(false);
                                            if (event.type === 'set' && selectedDate) {
                                                setEditDateValue(selectedDate);
                                                setEditValue(formatDate(selectedDate));
                                            }
                                        }}
                                    />
                                )}
                                {showEditDatePicker && Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={{ alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16 }}
                                        onPress={() => setShowEditDatePicker(false)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 15, fontWeight: '600', color: AppColors.primary }}>Done</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )
                    ) : (
                        <TextInput
                            style={styles.editInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            autoFocus
                            placeholderTextColor={AppColors.placeholder}
                        />
                    )}
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
                    {!contactsLoading && phoneContacts.length > 0 && (
                        <TextInput
                            style={styles.contactSearchInput}
                            placeholder="Search contacts..."
                            placeholderTextColor={AppColors.placeholder}
                            value={contactSearch}
                            onChangeText={setContactSearch}
                            autoCorrect={false}
                        />
                    )}
                    {contactsLoading ? (
                        <View style={styles.contactsLoadingWrap}>
                            <ActivityIndicator size="large" color={AppColors.primary} />
                            <Text style={styles.contactsLoadingText}>Loading contacts...</Text>
                        </View>
                    ) : phoneContacts.length === 0 ? (
                        <View style={styles.contactsLoadingWrap}>
                            <Text style={styles.contactsLoadingText}>No contacts found on this device.</Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {phoneContacts
                                .filter((c) => {
                                    if (!contactSearch.trim()) return true;
                                    const q = contactSearch.toLowerCase();
                                    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
                                })
                                .map((c, idx, arr) => (
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
                                        {idx < arr.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                        </ScrollView>
                    )}
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
    icon, label, value, onEdit, last, readOnly,
}: {
    icon: string; label: string; value: string; onEdit: () => void; last?: boolean; readOnly?: boolean;
}) => (
    <TouchableOpacity
        style={[infoStyles.row, last && { paddingBottom: 0 }]}
        onPress={readOnly ? undefined : onEdit}
        activeOpacity={readOnly ? 1 : 0.7}
        disabled={readOnly}
    >
        <View style={infoStyles.iconWrap}>
            <IconSymbol name={icon as any} size={16} color={AppColors.primary} />
        </View>
        <View style={infoStyles.content}>
            <Text style={infoStyles.label}>{label}</Text>
            <Text style={infoStyles.value} numberOfLines={1}>{value || '—'}</Text>
        </View>
        {readOnly ? (
            <IconSymbol name="lock.fill" size={13} color={AppColors.disconnected} />
        ) : (
            <IconSymbol name="pencil" size={15} color={AppColors.disconnected} />
        )}
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
    contactSearchInput: {
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: AppColors.textPrimary,
        backgroundColor: AppColors.background,
        marginBottom: 12,
    },
    contactsLoadingWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    contactsLoadingText: {
        fontSize: 14,
        color: AppColors.textSecondary,
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
