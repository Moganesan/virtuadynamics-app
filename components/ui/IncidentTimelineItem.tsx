import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBadge, StatusType } from './StatusBadge';

export interface IncidentDetails {
    id: string;
    timestamp: string;
    type: string;
    severity: StatusType;
    vitalSnapshot: {
        hr: number;
        spo2: number;
    };
    droneImageParams?: {
        url: string;
        caption: string;
    };
    transcript?: string;
    escalationLog: string[];
}

interface IncidentTimelineItemProps {
    incident: IncidentDetails;
}

export const IncidentTimelineItem = ({ incident }: IncidentTimelineItemProps) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.timelineLine} />

            <View style={[styles.timelineDot, {
                backgroundColor: incident.severity === 'critical' ? AppColors.critical :
                    incident.severity === 'warning' ? AppColors.warning : AppColors.success
            }]} />

            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => setExpanded(!expanded)}
            >
                {/* Collapsed Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.type}>{incident.type}</Text>
                        <Text style={styles.timestamp}>{incident.timestamp}</Text>
                    </View>
                    <StatusBadge status={incident.severity} />
                </View>

                {/* Expanded Content */}
                {expanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.divider} />

                        {/* Vitals Snapshot */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Vital Snapshot</Text>
                            <View style={styles.vitalsRow}>
                                <View style={styles.vitalBadge}>
                                    <IconSymbol name="heart.fill" size={14} color={AppColors.critical} />
                                    <Text style={styles.vitalText}>{incident.vitalSnapshot.hr} BPM</Text>
                                </View>
                                <View style={styles.vitalBadge}>
                                    <IconSymbol name="lungs.fill" size={14} color={AppColors.primary} />
                                    <Text style={styles.vitalText}>{incident.vitalSnapshot.spo2}% SpO₂</Text>
                                </View>
                            </View>
                        </View>

                        {/* Drone Image (Mocked via params) */}
                        {incident.droneImageParams && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Drone Capture</Text>
                                <View style={styles.imagePlaceholder}>
                                    <IconSymbol name="camera.fill" size={24} color={AppColors.textSecondary} />
                                    <Text style={styles.imageText}>{incident.droneImageParams.caption}</Text>
                                </View>
                            </View>
                        )}

                        {/* Voice Transcript */}
                        {incident.transcript && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Voice Interaction</Text>
                                <View style={styles.transcriptBox}>
                                    <Text style={styles.transcriptText}>"{incident.transcript}"</Text>
                                </View>
                            </View>
                        )}

                        {/* Escalation Log */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Escalation Log</Text>
                            {incident.escalationLog.map((log, index) => (
                                <View key={index} style={styles.logItem}>
                                    <IconSymbol name="checkmark.circle.fill" size={14} color={AppColors.success} />
                                    <Text style={styles.logText}>{log}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginBottom: 16,
        paddingLeft: 12,
    },
    timelineLine: {
        position: 'absolute',
        left: 20,
        top: 24,
        bottom: -16,
        width: 2,
        backgroundColor: AppColors.border,
    },
    timelineDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        position: 'absolute',
        left: 13,
        top: 24,
        borderWidth: 3,
        borderColor: AppColors.background,
        zIndex: 1,
    },
    card: {
        flex: 1,
        marginLeft: 24,
        backgroundColor: AppColors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
        shadowColor: AppColors.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    type: {
        fontSize: 16,
        fontWeight: '700',
        color: AppColors.textPrimary,
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 14,
        color: AppColors.textSecondary,
        fontWeight: '500',
    },
    expandedContent: {
        marginTop: 16,
    },
    divider: {
        height: 1,
        backgroundColor: AppColors.border,
        marginBottom: 16,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    vitalsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    vitalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppColors.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    vitalText: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.textPrimary,
    },
    imagePlaceholder: {
        height: 120,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: AppColors.border,
        borderStyle: 'dashed',
        gap: 8,
    },
    imageText: {
        color: AppColors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    transcriptBox: {
        backgroundColor: '#fffbeb',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: AppColors.warning,
    },
    transcriptText: {
        fontSize: 14,
        fontStyle: 'italic',
        color: AppColors.textLabel,
        lineHeight: 20,
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    logText: {
        fontSize: 14,
        color: AppColors.textPrimary,
    },
});
