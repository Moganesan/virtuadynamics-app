import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { droneApiService } from '@/services/api';
import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import SocketIO from 'socket.io-client';
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── 3D Math ───────────────────────────────────────────────────────────────────

type P3 = [number, number, number];
interface Proj { x: number; y: number; d: number }

const FOV   = 200;
const CAM_Z = 230;
const ARM_L = 50;
const ROTOR_R = 22;
const BODY_H = 12;

const ROTOR_TIPS: P3[] = [
    [-ARM_L, -ARM_L, 0],
    [ ARM_L, -ARM_L, 0],
    [ ARM_L,  ARM_L, 0],
    [-ARM_L,  ARM_L, 0],
];

const BODY_VERTS: P3[] = [
    [-BODY_H, -BODY_H, 0],
    [ BODY_H, -BODY_H, 0],
    [ BODY_H,  BODY_H, 0],
    [-BODY_H,  BODY_H, 0],
];

function rotateP(p: P3, pitch: number, yaw: number, roll: number): P3 {
    const [x0, y0, z0] = p;
    // Yaw: rotate around Y-axis
    const x1 = x0 * Math.cos(yaw) + z0 * Math.sin(yaw);
    const y1 = y0;
    const z1 = -x0 * Math.sin(yaw) + z0 * Math.cos(yaw);
    // Pitch: rotate around X-axis
    const x2 = x1;
    const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch);
    // Roll: rotate around Z-axis
    const x3 = x2 * Math.cos(roll) - y2 * Math.sin(roll);
    const y3 = x2 * Math.sin(roll) + y2 * Math.cos(roll);
    return [x3, y3, z2];
}

function projectP(p: P3, cx: number, cy: number): Proj {
    const d = FOV / (p[2] + CAM_Z);
    return { x: cx + p[0] * d, y: cy + p[1] * d, d };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DroneControlScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        id: string;
        name: string;
        battery: string;
        status: string;
        apiUrl: string;
    }>();

    const droneName = params.name   ?? 'Drone';
    const apiUrl    = params.apiUrl ?? '';

    const [pitch,     setPitch]     = useState(0);   // degrees from drone API
    const [yaw,       setYaw]       = useState(0);
    const [roll,      setRoll]      = useState(0);
    const [battery,   setBattery]   = useState(parseInt(params.battery ?? '0', 10));
    const [armed,     setArmed]     = useState(false);
    const [altitude,  setAltitude]  = useState(0);
    const [mode,      setMode]      = useState('');
    const [connected, setConnected] = useState(false);
    const [toggling,  setToggling]  = useState(false);
    const [launching, setLaunching] = useState(false);

    const { width } = useWindowDimensions();
    const CANVAS_W = Math.max(width - 40, 100);
    const CANVAS_H = Math.round(CANVAS_W * 0.72);
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    // ── Connect to drone's own Flask-SocketIO server ──────────────────────────
    // Drone emits 'telemetry' every 200 ms with pitch/roll/yaw in radians.

    useEffect(() => {
        if (!apiUrl) return;

        const RAD = 180 / Math.PI;

        const droneSocket = SocketIO(apiUrl, {
            transports: ['websocket'],
            autoConnect: true,
        });

        droneSocket.on('connect',       () => setConnected(true));
        droneSocket.on('disconnect',    () => setConnected(false));
        droneSocket.on('connect_error', () => setConnected(false));

        droneSocket.on('telemetry', (data: any) => {
            setPitch((data.pitch ?? 0) * RAD);
            setYaw(  (data.yaw   ?? 0) * RAD);
            setRoll( (data.roll  ?? 0) * RAD);
            setBattery(data.battery_level ?? 0);
            if (data.armed    !== undefined) setArmed(data.armed);
            if (data.altitude !== undefined) setAltitude(Number(data.altitude));
            if (data.mode     !== undefined) setMode(data.mode);
            setConnected(true);
        });

        return () => { droneSocket.disconnect(); };
    }, [apiUrl]);

    // ── 3D Geometry ──────────────────────────────────────────────────────────

    const pitchRad = (pitch * Math.PI) / 180;
    const yawRad   = (yaw   * Math.PI) / 180;
    const rollRad  = (roll  * Math.PI) / 180;

    const geo = useMemo(() => {
        const rotors = ROTOR_TIPS.map(tp =>
            projectP(rotateP(tp, pitchRad, yawRad, rollRad), cx, cy)
        );
        const body   = projectP(rotateP([0, 0, 0], pitchRad, yawRad, rollRad), cx, cy);
        const bVerts = BODY_VERTS.map(bp =>
            projectP(rotateP(bp, pitchRad, yawRad, rollRad), cx, cy)
        );

        const armPath = Skia.Path.Make();
        rotors.forEach(r => { armPath.moveTo(body.x, body.y); armPath.lineTo(r.x, r.y); });

        const bodyPath = Skia.Path.Make();
        bVerts.forEach((v, i) => { i === 0 ? bodyPath.moveTo(v.x, v.y) : bodyPath.lineTo(v.x, v.y); });
        bodyPath.close();

        const crossPath = Skia.Path.Make();
        if (bVerts.length === 4) {
            crossPath.moveTo(bVerts[0].x, bVerts[0].y); crossPath.lineTo(bVerts[2].x, bVerts[2].y);
            crossPath.moveTo(bVerts[1].x, bVerts[1].y); crossPath.lineTo(bVerts[3].x, bVerts[3].y);
        }

        return { rotors, body, armPath, bodyPath, crossPath };
    }, [pitchRad, yawRad, rollRad, cx, cy]);

    const bgPaths = useMemo(() => {
        const hLine = Skia.Path.Make();
        hLine.moveTo(cx - 95, cy); hLine.lineTo(cx + 95, cy);
        const vLine = Skia.Path.Make();
        vLine.moveTo(cx, cy - 95); vLine.lineTo(cx, cy + 95);
        return { hLine, vLine };
    }, [cx, cy]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleArmToggle = async (value: boolean) => {
        if (!apiUrl) return;
        setToggling(true);
        try {
            if (value) {
                await droneApiService.arm(apiUrl);
            } else {
                await droneApiService.disarm(apiUrl);
            }
            setArmed(value);
        } catch (e) {
            console.error('[DroneControl] arm toggle error:', e);
        } finally {
            setToggling(false);
        }
    };

    const handleTakeoff = async () => {
        if (!armed || !apiUrl) return;
        setLaunching(true);
        try {
            await droneApiService.takeoff(apiUrl, 3);
        } catch (e) {
            console.error('[DroneControl] takeoff error:', e);
        } finally {
            setLaunching(false);
        }
    };

    // ── Derived UI ───────────────────────────────────────────────────────────

    const droneColor   = armed ? AppColors.primary : '#64748b';
    const batteryColor = battery > 50 ? AppColors.success : battery > 20 ? AppColors.warning : AppColors.critical;

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <IconSymbol name="chevron.left" size={22} color={AppColors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{droneName}</Text>
                    {mode ? <Text style={styles.modeText}>{mode}</Text> : null}
                </View>
                <View style={[styles.liveTag, !connected && styles.liveTagOffline]}>
                    <View style={[styles.liveDot, !connected && styles.liveDotOffline]} />
                    <Text style={[styles.liveText, !connected && styles.liveTextOffline]}>
                        {connected ? 'LIVE' : 'OFF'}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── 3D Drone Canvas ── */}
                <View style={[styles.canvasWrapper, { height: CANVAS_H }]}>
                    <Canvas style={{ width: CANVAS_W, height: CANVAS_H }}>
                        {/* Scope rings */}
                        {[30, 60, 92].map(r => (
                            <Circle key={r} cx={cx} cy={cy} r={r}
                                color="#ffffff08" style="stroke" strokeWidth={1} />
                        ))}
                        {/* Cross-hair */}
                        <Path path={bgPaths.hLine} color="#ffffff0c" style="stroke" strokeWidth={1} />
                        <Path path={bgPaths.vLine} color="#ffffff0c" style="stroke" strokeWidth={1} />
                        {/* Arms */}
                        <Path path={geo.armPath} color={droneColor}
                            style="stroke" strokeWidth={5} strokeCap="round" />
                        {/* Rotors */}
                        {geo.rotors.map((r, i) => (
                            <Group key={i}>
                                <Circle cx={r.x} cy={r.y} r={ROTOR_R * r.d}
                                    color={`${droneColor}28`} />
                                <Circle cx={r.x} cy={r.y} r={ROTOR_R * r.d}
                                    color={droneColor} style="stroke" strokeWidth={2} />
                            </Group>
                        ))}
                        {/* Body */}
                        <Path path={geo.bodyPath} color={droneColor} style="stroke" strokeWidth={2.5} />
                        <Path path={geo.crossPath} color={droneColor} style="stroke" strokeWidth={1.5} />
                        <Circle cx={geo.body.x} cy={geo.body.y} r={5} color={droneColor} />
                    </Canvas>
                </View>

                {/* ── Axis Telemetry ── */}
                <View style={styles.axisRow}>
                    {[
                        { label: 'PITCH', value: pitch, color: AppColors.primary },
                        { label: 'YAW',   value: yaw,   color: AppColors.success },
                        { label: 'ROLL',  value: roll,  color: AppColors.warning },
                    ].map(({ label, value, color }) => (
                        <View key={label} style={styles.axisCard}>
                            <Text style={[styles.axisValue, { color }]}>{value.toFixed(1)}°</Text>
                            <Text style={styles.axisLabel}>{label}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Battery ── */}
                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <View style={styles.cardRowLeft}>
                            <IconSymbol name="battery.100" size={18} color={batteryColor} />
                            <Text style={styles.cardTitle}>Battery</Text>
                        </View>
                        <Text style={[styles.batteryPct, { color: batteryColor }]}>{battery}%</Text>
                    </View>
                    <View style={styles.batteryTrack}>
                        <View style={[styles.batteryFill,
                            { width: `${battery}%` as any, backgroundColor: batteryColor }]}
                        />
                    </View>
                </View>

                {/* ── Arm / Disarm ── */}
                <View style={[styles.card, styles.rowCard]}>
                    <View style={styles.cardRowLeft}>
                        <View style={[styles.armDot,
                            { backgroundColor: armed ? AppColors.success : AppColors.disconnected }]}
                        />
                        <View>
                            <Text style={styles.cardTitle}>{armed ? 'Armed' : 'Disarmed'}</Text>
                            <Text style={styles.cardSub}>Propulsion {armed ? 'enabled' : 'disabled'}</Text>
                        </View>
                    </View>
                    <Switch
                        value={armed}
                        onValueChange={handleArmToggle}
                        disabled={toggling || !connected}
                        trackColor={{ false: AppColors.border, true: `${AppColors.success}55` }}
                        thumbColor={armed ? AppColors.success : AppColors.disconnected}
                    />
                </View>

                {/* ── Altitude ── */}
                <View style={[styles.card, styles.rowCard]}>
                    <View style={styles.cardRowLeft}>
                        <IconSymbol name="arrow.up" size={18} color={AppColors.primary} />
                        <Text style={styles.cardTitle}>Altitude</Text>
                    </View>
                    <Text style={[styles.altitudeVal, { color: AppColors.primary }]}>
                        {altitude.toFixed(1)} m
                    </Text>
                </View>

                {/* ── Takeoff ── */}
                <TouchableOpacity
                    style={[styles.takeoffBtn, (!armed || !connected) && styles.takeoffDisabled]}
                    onPress={handleTakeoff}
                    disabled={!armed || !connected || launching}
                    activeOpacity={0.85}
                >
                    <IconSymbol name="airplane" size={22} color={AppColors.white} />
                    <Text style={styles.takeoffText}>
                        {launching ? 'INITIATING...' : 'TAKE OFF'}
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
        backgroundColor: AppColors.surface,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: AppColors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: AppColors.textPrimary,
    },
    modeText: {
        fontSize: 11,
        color: AppColors.textSecondary,
        marginTop: 1,
    },
    liveTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: `${AppColors.success}18`,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    liveTagOffline: {
        backgroundColor: `${AppColors.disconnected}18`,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: AppColors.success,
    },
    liveDotOffline: {
        backgroundColor: AppColors.disconnected,
    },
    liveText: {
        fontSize: 11,
        fontWeight: '700',
        color: AppColors.success,
        letterSpacing: 0.8,
    },
    liveTextOffline: {
        color: AppColors.disconnected,
    },
    scroll: {
        padding: 20,
        gap: 16,
    },
    canvasWrapper: {
        backgroundColor: '#0f172a',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
    },
    axisRow: {
        flexDirection: 'row',
        gap: 12,
    },
    axisCard: {
        flex: 1,
        backgroundColor: AppColors.surface,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    axisValue: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    axisLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: AppColors.textSecondary,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: AppColors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
        gap: 12,
    },
    rowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 0,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: AppColors.textPrimary,
    },
    cardSub: {
        fontSize: 12,
        color: AppColors.textSecondary,
        marginTop: 1,
    },
    batteryPct: {
        fontSize: 15,
        fontWeight: '700',
    },
    batteryTrack: {
        height: 8,
        backgroundColor: AppColors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    batteryFill: {
        height: '100%',
        borderRadius: 4,
    },
    armDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    altitudeVal: {
        fontSize: 18,
        fontWeight: '700',
    },
    takeoffBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: AppColors.primary,
        borderRadius: 16,
        paddingVertical: 18,
        shadowColor: AppColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
        marginTop: 4,
    },
    takeoffDisabled: {
        backgroundColor: AppColors.disabled,
        shadowOpacity: 0,
        elevation: 0,
    },
    takeoffText: {
        fontSize: 16,
        fontWeight: '800',
        color: AppColors.white,
        letterSpacing: 1.2,
    },
});
