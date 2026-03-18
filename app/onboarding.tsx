import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { externalProfileService, getVirtuaLoginAuth, settingsService } from '@/services/api';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// ─── Step definitions ────────────────────────────────────────────────────────

const INTRO_STEPS = [
    {
        title: 'Welcome to VirtuaDynamics',
        subtitle: 'Connecting your health with advanced drone assistance.',
        icon: 'heart.text.square.fill',
        content:
            'Start by wearing your health monitoring device. It will constantly check your vital signs like Heart Rate and SpO\u2082 to ensure your safety.',
    },
    {
        title: 'Drone Companion',
        subtitle: 'Your personal automated responder.',
        icon: 'airplane.circle.fill',
        content:
            'In case of any anomalies detected in your vital signs or a fall, our drone will automatically dispatch to your location for visual and vocal assistance.',
    },
    {
        title: 'Safety First',
        subtitle: 'Acknowledge safety guidelines.',
        icon: 'shield.fill',
        content:
            'VirtuaDynamics provides monitoring and rapid response but is not a replacement for professional emergency medical services. Always contact emergency services for severe medical issues.',
    },
];

const TOTAL_STEPS = INTRO_STEPS.length + 1; // intro slides + profile form

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
    const router = useRouter();
    const { user, localToken, updateUser } = useAuth();

    const [currentStep, setCurrentStep] = useState(0);

    // Profile form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [address, setAddress] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isIntroStep = currentStep < INTRO_STEPS.length;
    const isProfileStep = currentStep === INTRO_STEPS.length;

    const handleNext = () => {
        if (isIntroStep) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmitProfile = async () => {
        setError('');

        if (!firstName.trim() || !lastName.trim()) {
            setError('First name and last name are required.');
            return;
        }

        if (!user) {
            setError('Session expired. Please sign in again.');
            return;
        }

        setLoading(true);

        try {
            // 1. Create profile on VirtuaLogin
            const auth = getVirtuaLoginAuth(user);
            const profileData: {
                first_name: string;
                last_name: string;
                phone?: string;
                date_of_birth?: string;
                home_address?: string;
            } = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            };
            if (phone.trim()) profileData.phone = phone.trim();
            if (dateOfBirth) profileData.date_of_birth = formatDate(dateOfBirth);
            if (address.trim()) profileData.home_address = address.trim();

            console.debug('[DEBUG][Onboarding] Creating VirtuaLogin profile:', JSON.stringify(profileData));
            const createRes = await externalProfileService.createProfile(profileData, auth);
            console.debug('[DEBUG][Onboarding] Create profile response:', JSON.stringify(createRes));

            if (createRes.error) {
                throw new Error(createRes.message || 'Failed to create profile.');
            }

            // 2. Extract the created profile from the response
            const createdProfile = createRes.data?.user_profiles?.[0] || createRes.data;

            // 3. Update AuthContext with the new profile data
            const userUpdates: Record<string, any> = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            };
            if (createdProfile) {
                userUpdates.user_profiles = [
                    createdProfile,
                    ...(user.user_profiles?.slice(1) || []),
                ];
            } else {
                // Fallback: build profile object locally
                userUpdates.user_profiles = [{
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    phone: phone.trim(),
                    date_of_birth: dateOfBirth ? formatDate(dateOfBirth) : '',
                    home_address: address.trim(),
                }];
            }
            await updateUser(userUpdates);

            // 4. Save height/weight to local backend (if provided)
            if (localToken && (height.trim() || weight.trim())) {
                const healthData: { height?: string; weight?: string } = {};
                if (height.trim()) healthData.height = height.trim();
                if (weight.trim()) healthData.weight = weight.trim();

                console.debug('[DEBUG][Onboarding] Saving health data to local backend:', JSON.stringify(healthData));
                await settingsService.updateHealthData(healthData, localToken).catch((err) => {
                    console.error('[DEBUG][Onboarding] Health data save error (non-fatal):', err);
                });
            }

            console.debug('[DEBUG][Onboarding] Profile creation complete, navigating to dashboard');
            // AuthGate will auto-redirect since needsOnboarding becomes false
        } catch (err: any) {
            console.error('[DEBUG][Onboarding] Profile creation error:', err);
            setError(err.message || 'Failed to create profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Render intro slides ──────────────────────────────────────────────────

    if (isIntroStep) {
        const step = INTRO_STEPS[currentStep];
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.introContent}>
                    <View style={styles.iconContainer}>
                        <IconSymbol name={step.icon as any} size={80} color={AppColors.primary} />
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.introTitle}>{step.title}</Text>
                        <Text style={styles.introSubtitle}>{step.subtitle}</Text>
                        <Text style={styles.introDescription}>{step.content}</Text>
                    </View>

                    <View style={styles.pagination}>
                        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                            <View
                                key={index}
                                style={[styles.dot, currentStep === index && styles.activeDot]}
                            />
                        ))}
                    </View>
                </View>

                <View style={styles.introFooter}>
                    {currentStep > 0 && (
                        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                            <Text style={styles.backBtnText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.nextBtn, currentStep === 0 && { flex: 1 }]}
                        onPress={handleNext}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.nextBtnText}>Next</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Render profile form (final step) ─────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.formScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.formHeader}>
                        <View style={styles.formIconWrap}>
                            <IconSymbol name="person.crop.circle.badge.plus" size={40} color={AppColors.primary} />
                        </View>
                        <Text style={styles.formTitle}>Complete Your Profile</Text>
                        <Text style={styles.formSubtitle}>
                            Help us personalise your experience. Fields marked * are required.
                        </Text>
                    </View>

                    {/* Pagination */}
                    <View style={[styles.pagination, { marginBottom: 24 }]}>
                        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                            <View
                                key={index}
                                style={[styles.dot, currentStep === index && styles.activeDot]}
                            />
                        ))}
                    </View>

                    {/* Form Fields */}
                    <View style={styles.fieldRow}>
                        <View style={styles.fieldHalf}>
                            <Text style={styles.fieldLabel}>First Name *</Text>
                            <TextInput
                                style={styles.fieldInput}
                                placeholder="John"
                                placeholderTextColor={AppColors.placeholder}
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={styles.fieldHalf}>
                            <Text style={styles.fieldLabel}>Last Name *</Text>
                            <TextInput
                                style={styles.fieldInput}
                                placeholder="Doe"
                                placeholderTextColor={AppColors.placeholder}
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Phone Number</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="+91 98765 43210"
                            placeholderTextColor={AppColors.placeholder}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Date of Birth</Text>
                        {Platform.OS === 'web' ? (
                            <input
                                type="date"
                                value={dateOfBirth ? formatDate(dateOfBirth) : ''}
                                max={formatDate(new Date())}
                                onChange={(e) => {
                                    const val = (e.target as HTMLInputElement).value;
                                    if (val) {
                                        const parts = val.split('-');
                                        setDateOfBirth(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
                                    } else {
                                        setDateOfBirth(null);
                                    }
                                }}
                                style={{
                                    backgroundColor: AppColors.surface,
                                    border: `1px solid ${AppColors.border}`,
                                    borderRadius: 12,
                                    paddingLeft: 14,
                                    paddingRight: 14,
                                    paddingTop: 12,
                                    paddingBottom: 12,
                                    fontSize: 15,
                                    color: AppColors.textPrimary,
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    width: '100%',
                                    boxSizing: 'border-box' as const,
                                }}
                            />
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={styles.fieldInput}
                                    onPress={() => setShowDatePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={dateOfBirth ? styles.dateText : styles.datePlaceholder}>
                                        {dateOfBirth ? formatDate(dateOfBirth) : 'Select date of birth'}
                                    </Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={dateOfBirth || new Date(2000, 0, 1)}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        maximumDate={new Date()}
                                        onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                                            if (Platform.OS === 'android') setShowDatePicker(false);
                                            if (event.type === 'set' && selectedDate) {
                                                setDateOfBirth(selectedDate);
                                            }
                                        }}
                                    />
                                )}
                                {showDatePicker && Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={styles.datePickerDone}
                                        onPress={() => {
                                            if (!dateOfBirth) setDateOfBirth(new Date(2000, 0, 1));
                                            setShowDatePicker(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.datePickerDoneText}>Done</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Home Address</Text>
                        <TextInput
                            style={[styles.fieldInput, { minHeight: 60, textAlignVertical: 'top' }]}
                            placeholder="123 Main Street, City"
                            placeholderTextColor={AppColors.placeholder}
                            value={address}
                            onChangeText={setAddress}
                            multiline
                        />
                    </View>

                    {/* Health data section */}
                    <View style={styles.sectionDivider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>Health Info (Optional)</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.fieldRow}>
                        <View style={styles.fieldHalf}>
                            <Text style={styles.fieldLabel}>Height</Text>
                            <TextInput
                                style={styles.fieldInput}
                                placeholder='e.g. 175 cm'
                                placeholderTextColor={AppColors.placeholder}
                                value={height}
                                onChangeText={setHeight}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.fieldHalf}>
                            <Text style={styles.fieldLabel}>Weight</Text>
                            <TextInput
                                style={styles.fieldInput}
                                placeholder='e.g. 70 kg'
                                placeholderTextColor={AppColors.placeholder}
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </ScrollView>

                {/* Footer buttons */}
                <View style={styles.formFooter}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                        <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmitProfile}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={AppColors.textPrimary} size="small" />
                        ) : (
                            <Text style={styles.submitBtnText}>Create Profile</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    // Intro slides
    introContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: `${AppColors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    introTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    introSubtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: AppColors.textSecondary,
        marginBottom: 16,
        textAlign: 'center',
    },
    introDescription: {
        fontSize: 16,
        color: AppColors.textLabel,
        textAlign: 'center',
        lineHeight: 24,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: AppColors.border,
    },
    activeDot: {
        width: 24,
        backgroundColor: AppColors.primary,
    },
    introFooter: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingBottom: 40,
        gap: 12,
    },
    backBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: AppColors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: AppColors.textSecondary,
    },
    nextBtn: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: AppColors.textPrimary,
    },
    // Profile form
    formScroll: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    formHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    formIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${AppColors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: AppColors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    formSubtitle: {
        fontSize: 14,
        color: AppColors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    fieldRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    fieldHalf: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.textLabel,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    fieldInput: {
        backgroundColor: AppColors.surface,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: AppColors.textPrimary,
    },
    dateText: {
        fontSize: 15,
        color: AppColors.textPrimary,
    },
    datePlaceholder: {
        fontSize: 15,
        color: AppColors.placeholder,
    },
    datePickerDone: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 4,
    },
    datePickerDoneText: {
        fontSize: 15,
        fontWeight: '600',
        color: AppColors.primary,
    },
    sectionDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: AppColors.border,
    },
    dividerText: {
        fontSize: 12,
        fontWeight: '600',
        color: AppColors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    errorText: {
        color: AppColors.critical,
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '500',
        marginTop: 8,
    },
    formFooter: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 40,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
        backgroundColor: AppColors.background,
    },
    submitBtn: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: AppColors.disabled,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: AppColors.textPrimary,
    },
});
