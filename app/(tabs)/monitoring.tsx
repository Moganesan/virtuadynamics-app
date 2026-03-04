import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

type Severity = 'critical' | 'warning' | 'resolved';
type FilterType = 'all' | Severity;

interface AnomalyRecord {
    id: string;
    date: string;
    time: string;
    anomalyType: string;
    severity: Severity;
    routedTo: string;
    routedRole: string;
    droneId: string;
    location: string;
    hasRecording: boolean;
    recordingDuration: string;
    notes: string;
}

const HISTORY: AnomalyRecord[] = [
    {
        id: '1',
        date: 'Mar 04, 2026',
        time: '14:32',
        anomalyType: 'Cardiac Anomaly',
        severity: 'critical',
        routedTo: 'Dr. Sarah Chen',
        routedRole: 'Cardiologist',
        droneId: 'VD-Responder Beta',
        location: 'Sector 4, Block C',
        hasRecording: true,
        recordingDuration: '3:42',
        notes: 'Irregular heart rhythm detected. Drone dispatched within 90s.',
    },
    {
        id: '2',
        date: 'Mar 03, 2026',
        time: '09:15',
        anomalyType: 'Fall Detected',
        severity: 'warning',
        routedTo: 'Nurse Station 2',
        routedRole: 'On-Duty Nurse',
        droneId: 'VD-Responder Alpha',
        location: 'Room 12, Ward B',
        hasRecording: true,
        recordingDuration: '1:18',
        notes: 'Patient fall detected via accelerometer spike. Nurse responded in 4 mins.',
    },
    {
        id: '3',
        date: 'Mar 02, 2026',
        time: '22:47',
        anomalyType: 'Respiratory Distress',
        severity: 'critical',
        routedTo: 'Emergency Services',
        routedRole: 'Paramedic Team',
        droneId: 'VD-Responder Beta',
        location: 'Outdoor Zone A',
        hasRecording: true,
        recordingDuration: '5:09',
        notes: 'SpO₂ dropped below 88%. Emergency services alerted immediately.',
    },
    {
        id: '4',
        date: 'Mar 01, 2026',
        time: '11:03',
        anomalyType: 'High Temperature',
        severity: 'warning',
        routedTo: 'Dr. Raj Patel',
        routedRole: 'General Physician',
        droneId: 'VD-Scout Delta',
        location: 'Room 7, Ward A',
        hasRecording: false,
        recordingDuration: '',
        notes: 'Body temperature exceeded 39.2°C. Medication administered.',
    },
    {
        id: '5',
        date: 'Feb 28, 2026',
        time: '16:55',
        anomalyType: 'Irregular Heart Rate',
        severity: 'resolved',
        routedTo: 'Dr. Mei Lin',
        routedRole: 'Cardiologist',
        droneId: 'VD-Responder Alpha',
        location: 'Corridor 3',
        hasRecording: true,
        recordingDuration: '2:27',
        notes: 'Brief arrhythmia episode. Patient stabilised within 10 minutes.',
    },
    {
        id: '6',
        date: 'Feb 27, 2026',
        time: '07:22',
        anomalyType: 'Low Blood Oxygen',
        severity: 'resolved',
        routedTo: 'Nurse Station 1',
        routedRole: 'On-Duty Nurse',
        droneId: 'VD-Responder Gamma',
        location: 'ICU Bay 2',
        hasRecording: false,
        recordingDuration: '',
        notes: 'SpO₂ at 91%, improved after supplemental oxygen.',
    },
];

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; icon: string }> = {
    critical: { label: 'Critical', color: AppColors.critical, bg: `${AppColors.critical}15`, icon: 'exclamationmark.triangle.fill' },
    warning:  { label: 'Warning',  color: AppColors.warning,  bg: `${AppColors.warning}15`,  icon: 'exclamationmark.triangle.fill' },
    resolved: { label: 'Resolved', color: AppColors.success,  bg: `${AppColors.success}15`,  icon: 'checkmark.circle.fill' },
};

const FILTERS: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Critical', value: 'critical' },
    { label: 'Warning', value: 'warning' },
    { label: 'Resolved', value: 'resolved' },
];

export default function HistoryScreen() {
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [selectedRecord, setSelectedRecord] = useState<AnomalyRecord | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playProgress] = useState(new Animated.Value(0));
    const playAnim = useRef<Animated.CompositeAnimation | null>(null);

    const filtered = activeFilter === 'all'
        ? HISTORY
        : HISTORY.filter((r) => r.severity === activeFilter);

    const handlePlay = (record: AnomalyRecord) => {
        setSelectedRecord(record);
        setIsPlaying(false);
        playProgress.setValue(0);
    };

    const togglePlay = () => {
        if (isPlaying) {
            playAnim.current?.stop();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            playAnim.current = Animated.timing(playProgress, {
                toValue: 1,
                duration: 8000,
                useNativeDriver: false,
            });
            playAnim.current.start(({ finished }) => {
                if (finished) {
                    setIsPlaying(false);
                    playProgress.setValue(0);
                }
            });
        }
    };

    const closePlayer = () => {
        playAnim.current?.stop();
        setIsPlaying(false);
        playProgress.setValue(0);
        setSelectedRecord(null);
    };

    const criticalCount = HISTORY.filter((r) => r.severity === 'critical').length;
    const warningCount  = HISTORY.filter((r) => r.severity === 'warning').length;
    const resolvedCount = HISTORY.filter((r) => r.severity === 'resolved').length;

    return (
        <View style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

                {/* Summary Row */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { borderColor: `${AppColors.critical}40` }]}>
                        <Text style={[styles.summaryCount, { color: AppColors.critical }]}>{criticalCount}</Text>
                        <Text style={styles.summaryLabel}>Critical</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: `${AppColors.warning}40` }]}>
                        <Text style={[styles.summaryCount, { color: AppColors.warning }]}>{warningCount}</Text>
                        <Text style={styles.summaryLabel}>Warning</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: `${AppColors.success}40` }]}>
                        <Text style={[styles.summaryCount, { color: AppColors.success }]}>{resolvedCount}</Text>
                        <Text style={styles.summaryLabel}>Resolved</Text>
                    </View>
                </View>

                {/* Filter Chips */}
                <View style={styles.filterRow}>
                    <IconSymbol name="line.3.horizontal.decrease" size={18} color={AppColors.textSecondary} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {FILTERS.map((f) => (
                            <TouchableOpacity
                                key={f.value}
                                style={[styles.filterChip, activeFilter === f.value && styles.filterChipActive]}
                                onPress={() => setActiveFilter(f.value)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterChipText, activeFilter === f.value && styles.filterChipTextActive]}>
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Records */}
                <View style={styles.recordList}>
                    {filtered.map((record) => {
                        const cfg = SEVERITY_CONFIG[record.severity];
                        return (
                            <View key={record.id} style={[styles.recordCard, { borderLeftColor: cfg.color, borderLeftWidth: 4 }]}>
                                {/* Top Row */}
                                <View style={styles.recordTop}>
                                    <View style={styles.recordDateBlock}>
                                        <IconSymbol name="clock.fill" size={13} color={AppColors.textSecondary} />
                                        <Text style={styles.recordDate}>{record.date}</Text>
                                        <Text style={styles.recordTime}>{record.time}</Text>
                                    </View>
                                    <View style={[styles.severityBadge, { backgroundColor: cfg.bg }]}>
                                        <View style={[styles.severityDot, { backgroundColor: cfg.color }]} />
                                        <Text style={[styles.severityText, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>
                                </View>

                                {/* Anomaly Type */}
                                <Text style={styles.anomalyType}>{record.anomalyType}</Text>
                                <Text style={styles.recordNotes}>{record.notes}</Text>

                                {/* Detail Row */}
                                <View style={styles.detailRow}>
                                    <View style={styles.detailItem}>
                                        <IconSymbol name="person.fill" size={13} color={AppColors.primary} />
                                        <View>
                                            <Text style={styles.detailLabel}>Routed To</Text>
                                            <Text style={styles.detailValue}>{record.routedTo}</Text>
                                            <Text style={styles.detailSub}>{record.routedRole}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailDivider} />
                                    <View style={styles.detailItem}>
                                        <IconSymbol name="airplane" size={13} color={AppColors.primary} />
                                        <View>
                                            <Text style={styles.detailLabel}>Drone</Text>
                                            <Text style={styles.detailValue}>{record.droneId}</Text>
                                            <Text style={styles.detailSub}>{record.location}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Recording Button */}
                                {record.hasRecording && (
                                    <TouchableOpacity
                                        style={styles.recordingButton}
                                        onPress={() => handlePlay(record)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.recordingIconWrap}>
                                            <IconSymbol name="mic.fill" size={14} color={AppColors.primary} />
                                        </View>
                                        <Text style={styles.recordingButtonText}>Play Call Recording</Text>
                                        <View style={styles.recordingDuration}>
                                            <Text style={styles.recordingDurationText}>{record.recordingDuration}</Text>
                                        </View>
                                        <IconSymbol name="chevron.right" size={14} color={AppColors.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Call Recording Player Modal */}
            <Modal
                visible={!!selectedRecord}
                transparent
                animationType="slide"
                onRequestClose={closePlayer}
            >
                <TouchableWithoutFeedback onPress={closePlayer}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>

                {selectedRecord && (
                    <View style={styles.playerSheet}>
                        <View style={styles.modalHandle} />

                        {/* Player Header */}
                        <View style={styles.playerHeader}>
                            <View style={styles.playerTitleBlock}>
                                <Text style={styles.playerTitle}>Call Recording</Text>
                                <Text style={styles.playerSubtitle}>{selectedRecord.anomalyType} · {selectedRecord.date} {selectedRecord.time}</Text>
                            </View>
                            <TouchableOpacity onPress={closePlayer} activeOpacity={0.7} style={styles.playerClose}>
                                <IconSymbol name="xmark.circle.fill" size={28} color={AppColors.border} />
                            </TouchableOpacity>
                        </View>

                        {/* Participants */}
                        <View style={styles.participantsRow}>
                            <View style={styles.participant}>
                                <View style={[styles.participantAvatar, { backgroundColor: `${AppColors.primary}20` }]}>
                                    <IconSymbol name="airplane" size={16} color={AppColors.primary} />
                                </View>
                                <Text style={styles.participantName}>{selectedRecord.droneId}</Text>
                                <Text style={styles.participantRole}>Drone</Text>
                            </View>
                            <View style={styles.participantLine} />
                            <View style={styles.participant}>
                                <View style={[styles.participantAvatar, { backgroundColor: `${AppColors.success}20` }]}>
                                    <IconSymbol name="person.fill" size={16} color={AppColors.success} />
                                </View>
                                <Text style={styles.participantName}>{selectedRecord.routedTo}</Text>
                                <Text style={styles.participantRole}>{selectedRecord.routedRole}</Text>
                            </View>
                        </View>

                        {/* Waveform Visual */}
                        <View style={styles.waveformContainer}>
                            <WaveformBars isPlaying={isPlaying} />
                        </View>

                        {/* Seek Bar */}
                        <View style={styles.seekBarContainer}>
                            <View style={styles.seekBarTrack}>
                                <Animated.View
                                    style={[
                                        styles.seekBarFill,
                                        {
                                            width: playProgress.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%'],
                                            }),
                                        },
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        styles.seekThumb,
                                        {
                                            left: playProgress.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '97%'],
                                            }),
                                        },
                                    ]}
                                />
                            </View>
                            <View style={styles.seekLabels}>
                                <Text style={styles.seekTime}>0:00</Text>
                                <Text style={styles.seekTime}>{selectedRecord.recordingDuration}</Text>
                            </View>
                        </View>

                        {/* Controls */}
                        <View style={styles.playerControls}>
                            <TouchableOpacity style={styles.playButton} onPress={togglePlay} activeOpacity={0.8}>
                                <IconSymbol
                                    name={isPlaying ? 'pause.fill' : 'play.fill'}
                                    size={28}
                                    color={AppColors.white}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Location tag */}
                        <View style={styles.locationTag}>
                            <IconSymbol name="location.fill" size={12} color={AppColors.textSecondary} />
                            <Text style={styles.locationText}>{selectedRecord.location}</Text>
                        </View>
                    </View>
                )}
            </Modal>
        </View>
    );
}

/** Animated waveform bars for the player */
const WaveformBars = ({ isPlaying }: { isPlaying: boolean }) => {
    const bars = Array.from({ length: 28 }, (_, i) => {
        const anim = useRef(new Animated.Value(0.3)).current;
        React.useEffect(() => {
            if (isPlaying) {
                const delay = (i % 7) * 80;
                const loop = Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, { toValue: 0.2 + Math.random() * 0.8, duration: 300 + Math.random() * 200, useNativeDriver: true, delay }),
                        Animated.timing(anim, { toValue: 0.15, duration: 300, useNativeDriver: true }),
                    ])
                );
                loop.start();
                return () => loop.stop();
            } else {
                anim.setValue(0.3);
            }
        }, [isPlaying]);
        return anim;
    });

    return (
        <View style={waveStyles.row}>
            {bars.map((anim, i) => (
                <Animated.View
                    key={i}
                    style={[
                        waveStyles.bar,
                        { transform: [{ scaleY: anim }], backgroundColor: i % 3 === 0 ? AppColors.primary : `${AppColors.primary}60` },
                    ]}
                />
            ))}
        </View>
    );
};

const waveStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        height: 48,
    },
    bar: {
        width: 4,
        height: 32,
        borderRadius: 2,
    },
});

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    // Summary
    summaryRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: AppColors.surface,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
    },
    summaryCount: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 2,
    },
    summaryLabel: {
        fontSize: 11,
        color: AppColors.textSecondary,
        fontWeight: '600',
    },
    // Filters
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    filterScroll: {
        gap: 8,
        paddingRight: 4,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: AppColors.surface,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    filterChipActive: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.textSecondary,
    },
    filterChipTextActive: {
        color: AppColors.white,
    },
    // Record cards
    recordList: {
        gap: 16,
    },
    recordCard: {
        backgroundColor: AppColors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
        gap: 10,
    },
    recordTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recordDateBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    recordDate: {
        fontSize: 12,
        color: AppColors.textSecondary,
        fontWeight: '500',
    },
    recordTime: {
        fontSize: 12,
        color: AppColors.textSecondary,
        fontWeight: '700',
    },
    severityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    severityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    severityText: {
        fontSize: 11,
        fontWeight: '700',
    },
    anomalyType: {
        fontSize: 17,
        fontWeight: '700',
        color: AppColors.textPrimary,
    },
    recordNotes: {
        fontSize: 13,
        color: AppColors.textSecondary,
        lineHeight: 18,
    },
    detailRow: {
        flexDirection: 'row',
        backgroundColor: AppColors.background,
        borderRadius: 12,
        padding: 12,
        gap: 12,
        alignItems: 'flex-start',
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
    },
    detailDivider: {
        width: 1,
        backgroundColor: AppColors.border,
        alignSelf: 'stretch',
    },
    detailLabel: {
        fontSize: 10,
        color: AppColors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.textPrimary,
    },
    detailSub: {
        fontSize: 11,
        color: AppColors.textSecondary,
    },
    recordingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: `${AppColors.primary}10`,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: `${AppColors.primary}30`,
    },
    recordingIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: `${AppColors.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingButtonText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.primary,
    },
    recordingDuration: {
        backgroundColor: `${AppColors.primary}20`,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    recordingDurationText: {
        fontSize: 11,
        fontWeight: '700',
        color: AppColors.primary,
    },
    // Modal overlay
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    // Player Sheet
    playerSheet: {
        backgroundColor: AppColors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 40,
        gap: 20,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AppColors.border,
        alignSelf: 'center',
        marginBottom: 4,
    },
    playerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    playerTitleBlock: {
        flex: 1,
    },
    playerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: AppColors.textPrimary,
        marginBottom: 2,
    },
    playerSubtitle: {
        fontSize: 13,
        color: AppColors.textSecondary,
    },
    playerClose: {
        padding: 2,
    },
    // Participants
    participantsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
    },
    participant: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    participantAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    participantName: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.textPrimary,
        textAlign: 'center',
    },
    participantRole: {
        fontSize: 11,
        color: AppColors.textSecondary,
        textAlign: 'center',
    },
    participantLine: {
        flex: 1,
        height: 1,
        backgroundColor: AppColors.border,
        marginBottom: 28,
    },
    // Waveform
    waveformContainer: {
        backgroundColor: AppColors.background,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 12,
    },
    // Seek
    seekBarContainer: {
        gap: 6,
    },
    seekBarTrack: {
        height: 4,
        backgroundColor: AppColors.border,
        borderRadius: 2,
        overflow: 'visible',
        position: 'relative',
    },
    seekBarFill: {
        height: '100%',
        backgroundColor: AppColors.primary,
        borderRadius: 2,
    },
    seekThumb: {
        position: 'absolute',
        top: -6,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: AppColors.primary,
        shadowColor: AppColors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
    seekLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    seekTime: {
        fontSize: 11,
        color: AppColors.textSecondary,
        fontWeight: '500',
    },
    // Controls
    playerControls: {
        alignItems: 'center',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: AppColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    locationTag: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    locationText: {
        fontSize: 12,
        color: AppColors.textSecondary,
    },
});
