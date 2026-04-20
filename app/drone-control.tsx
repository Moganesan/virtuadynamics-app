import { IconSymbol } from '@/components/ui/icon-symbol';
import { droneProxyService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Canvas, Path, Circle, Skia } from '@shopify/react-native-skia';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    bg:          '#020b18',
    armed:       '#00e5ff',
    disarmed:    '#2a4a6b',
    glass:       'rgba(2,18,42,0.84)',
    glassBorder: 'rgba(0,229,255,0.18)',
    dim:         '#2d5070',
    textBright:  '#d0eeff',
    textDim:     '#4a7a9b',
    success:     '#00ff9d',
    warning:     '#ffb300',
    danger:      '#ff3b5c',
    white:       '#ffffff',
};

// ── 3D Math ───────────────────────────────────────────────────────────────────

type P3 = [number, number, number];
interface Proj { x: number; y: number; d: number }

const FOV      = 360;
const CAM_Z    = 420;
const ARM_L    = 96;
const ROTOR_R  = 42;
const BODY_R   = 18;
const ARM_W_NEAR = 8;
const ARM_W_FAR  = 5;
const ELEV     = 0.44;

const ROTOR_TIPS: P3[] = [
    [-ARM_L, 0, -ARM_L],
    [ ARM_L, 0, -ARM_L],
    [ ARM_L, 0,  ARM_L],
    [-ARM_L, 0,  ARM_L],
];

function rotateP(p: P3, pitch: number, yaw: number, roll: number): P3 {
    const [x0, y0, z0] = p;
    const x1 =  x0 * Math.cos(yaw) + z0 * Math.sin(yaw);
    const z1 = -x0 * Math.sin(yaw) + z0 * Math.cos(yaw);
    const y2 = y0 * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y0 * Math.sin(pitch) + z1 * Math.cos(pitch);
    const x3 = x1 * Math.cos(roll) - y2 * Math.sin(roll);
    const y3 = x1 * Math.sin(roll) + y2 * Math.cos(roll);
    return [x3, y3, z2];
}

function applyElev(p: P3): P3 {
    const [x, y, z] = p;
    const cosE = Math.cos(ELEV), sinE = Math.sin(ELEV);
    return [x, y * cosE - z * sinE, y * sinE + z * cosE];
}

function tf(p: P3, pr: number, yr: number, rr: number): P3 {
    return applyElev(rotateP(p, pr, yr, rr));
}

function proj(p: P3, cx: number, cy: number): Proj {
    const d = FOV / Math.max(p[2] + CAM_Z, 1);
    return { x: cx + p[0] * d, y: cy + p[1] * d, d };
}

function makeRotorPath(tip: P3, radius: number, pr: number, yr: number, rr: number, cx: number, cy: number) {
    const path = Skia.Path.Make();
    for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const pp = proj(tf([tip[0] + radius * Math.cos(a), tip[1], tip[2] + radius * Math.sin(a)], pr, yr, rr), cx, cy);
        i === 0 ? path.moveTo(pp.x, pp.y) : path.lineTo(pp.x, pp.y);
    }
    path.close();
    return path;
}

function makeArmPath(from: P3, to: P3, pr: number, yr: number, rr: number, cx: number, cy: number) {
    const dx = to[0] - from[0], dz = to[2] - from[2];
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const px = -dz / len, pz = dx / len;
    const corners: P3[] = [
        [from[0] + px * ARM_W_NEAR, from[1], from[2] + pz * ARM_W_NEAR],
        [from[0] - px * ARM_W_NEAR, from[1], from[2] - pz * ARM_W_NEAR],
        [to[0]   - px * ARM_W_FAR,  to[1],   to[2]   - pz * ARM_W_FAR],
        [to[0]   + px * ARM_W_FAR,  to[1],   to[2]   + pz * ARM_W_FAR],
    ];
    const path = Skia.Path.Make();
    corners.forEach((c, i) => {
        const pp = proj(tf(c, pr, yr, rr), cx, cy);
        i === 0 ? path.moveTo(pp.x, pp.y) : path.lineTo(pp.x, pp.y);
    });
    path.close();
    return path;
}

function makeBodyPath(radius: number, pr: number, yr: number, rr: number, cx: number, cy: number) {
    const path = Skia.Path.Make();
    for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const pp = proj(tf([radius * Math.cos(a), 0, radius * Math.sin(a)], pr, yr, rr), cx, cy);
        i === 0 ? path.moveTo(pp.x, pp.y) : path.lineTo(pp.x, pp.y);
    }
    path.close();
    return path;
}

function makeBladeLines(tip: P3, bladeAng: number, radius: number, pr: number, yr: number, rr: number, cx: number, cy: number) {
    return [0, 1].map(b => {
        const a = bladeAng + b * Math.PI;
        const p1: P3 = [tip[0] + radius * Math.cos(a), tip[1], tip[2] + radius * Math.sin(a)];
        const p2: P3 = [tip[0] - radius * Math.cos(a), tip[1], tip[2] - radius * Math.sin(a)];
        const pp1 = proj(tf(p1, pr, yr, rr), cx, cy);
        const pp2 = proj(tf(p2, pr, yr, rr), cx, cy);
        const path = Skia.Path.Make();
        path.moveTo(pp1.x, pp1.y);
        path.lineTo(pp2.x, pp2.y);
        return path;
    });
}

function makeGroundGrid(pr: number, yr: number, rr: number, cx: number, cy: number) {
    const paths: ReturnType<typeof Skia.Path.Make>[] = [];
    const SIZE = 220, STEP = 55, Y = 110;
    for (let x = -SIZE; x <= SIZE; x += STEP) {
        const path = Skia.Path.Make();
        const p1 = proj(tf([x, Y, -SIZE], pr, yr, rr), cx, cy);
        const p2 = proj(tf([x, Y,  SIZE], pr, yr, rr), cx, cy);
        path.moveTo(p1.x, p1.y); path.lineTo(p2.x, p2.y);
        paths.push(path);
    }
    for (let z = -SIZE; z <= SIZE; z += STEP) {
        const path = Skia.Path.Make();
        const p1 = proj(tf([-SIZE, Y, z], pr, yr, rr), cx, cy);
        const p2 = proj(tf([ SIZE, Y, z], pr, yr, rr), cx, cy);
        path.moveTo(p1.x, p1.y); path.lineTo(p2.x, p2.y);
        paths.push(path);
    }
    return paths;
}

function makeReticlePath(cx: number, cy: number, r: number, ticks: number) {
    const path = Skia.Path.Make();
    const SEGS = 120;
    for (let i = 0; i <= SEGS; i++) {
        const a = (i / SEGS) * Math.PI * 2;
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        i === 0 ? path.moveTo(x, y) : path.lineTo(x, y);
    }
    path.close();
    for (let t = 0; t < ticks; t++) {
        const a = (t / ticks) * Math.PI * 2;
        const inner = t % 3 === 0 ? r - 10 : r - 5;
        path.moveTo(cx + inner * Math.cos(a), cy + inner * Math.sin(a));
        path.lineTo(cx + r * Math.cos(a),     cy + r * Math.sin(a));
    }
    return path;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DroneControlScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string; name: string; battery: string; status: string; apiUrl: string }>();
    const { localToken } = useAuth();

    const droneId   = params.id     ?? '';
    const droneName = params.name   ?? 'Drone';
    const apiUrl    = params.apiUrl ?? '';

    console.log('[DroneControl] droneId =', droneId, 'apiUrl =', JSON.stringify(apiUrl));

    const [pitch,      setPitch]      = useState(0);
    const [yaw,        setYaw]        = useState(0);
    const [roll,       setRoll]       = useState(0);
    const [battery,    setBattery]    = useState(parseInt(params.battery ?? '0', 10));
    const [armed,      setArmed]      = useState(false);
    const [altitude,   setAltitude]   = useState(0);
    const [mode,       setMode]       = useState('');
    const [connected,  setConnected]  = useState(false);
    const [toggling,   setToggling]   = useState(false);
    const [launching,  setLaunching]  = useState(false);
    const [landing,     setLanding]     = useState(false);
    const [settingMode, setSettingMode] = useState(false);
    const [bladeAngle,  setBladeAngle]  = useState(0);

    const FLIGHT_MODES = ['STABILIZE', 'ALTHOLD', 'LOITER', 'GUIDED', 'LAND', 'RTL'] as const;

    const { width, height } = useWindowDimensions();
    const cx = width / 2;
    const cy = height * 0.38;

    // ── Blade spin ───────────────────────────────────────────────────────────
    const bladeRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (armed) {
            bladeRef.current = setInterval(() => setBladeAngle(a => a + 0.48), 16);
        } else {
            if (bladeRef.current) { clearInterval(bladeRef.current); bladeRef.current = null; }
        }
        return () => { if (bladeRef.current) clearInterval(bladeRef.current); };
    }, [armed]);

    // ── Telemetry ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!apiUrl) return;
        const RAD = 180 / Math.PI;
        let socketOk = false;
        let pollTimer: ReturnType<typeof setInterval> | null = null;
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

        const applyTelemetry = (data: any) => {
            setPitch((data.pitch ?? 0) * RAD);
            setYaw(  (data.yaw   ?? 0) * RAD);
            setRoll( (data.roll  ?? 0) * RAD);
            setBattery(data.battery_level ?? 0);
            if (data.armed    !== undefined) setArmed(data.armed);
            if (data.altitude !== undefined) setAltitude(Number(data.altitude));
            if (data.mode     !== undefined) setMode(data.mode);
            setConnected(true);
        };

        const startPoll = () => {
            if (pollTimer) return;
            pollTimer = setInterval(async () => {
                try {
                    const data = await droneProxyService.getStatus(droneId, localToken ?? '');
                    applyTelemetry(data);
                } catch (e: any) {
                    console.warn('[DroneControl] poll error:', e?.message);
                    setConnected(false);
                }
            }, 500);
        };

        const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };

        const droneSocket = SocketIO(apiUrl, { transports: ['polling', 'websocket'], upgrade: true, reconnectionAttempts: 3, timeout: 8000 });
        droneSocket.on('connect',       () => { socketOk = true; setConnected(true); stopPoll(); if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; } });
        droneSocket.on('disconnect',    () => { socketOk = false; setConnected(false); startPoll(); });
        droneSocket.on('connect_error', (err: any) => { console.warn('[DroneControl] socket error:', err?.message); setConnected(false); });
        droneSocket.on('telemetry', applyTelemetry);

        fallbackTimer = setTimeout(() => { if (!socketOk) { console.warn('[DroneControl] socket timeout — switching to HTTP poll'); startPoll(); } }, 6000);

        return () => { droneSocket.disconnect(); stopPoll(); if (fallbackTimer) clearTimeout(fallbackTimer); };
    }, [apiUrl]);

    // ── 3D Geometry ──────────────────────────────────────────────────────────
    const pr = (pitch * Math.PI) / 180;
    const yr = (yaw   * Math.PI) / 180;
    const rr = (roll  * Math.PI) / 180;

    const geo = useMemo(() => {
        const origin: P3 = [0, 0, 0];
        const depths = ROTOR_TIPS.map(tp => tf(tp, pr, yr, rr)[2]);
        const order  = [0, 1, 2, 3].sort((a, b) => depths[b] - depths[a]);

        const arms   = order.map(i => ({ path: makeArmPath(origin, ROTOR_TIPS[i], pr, yr, rr, cx, cy), idx: i }));
        const rotors = order.map(i => ({
            disc:   makeRotorPath(ROTOR_TIPS[i], ROTOR_R,        pr, yr, rr, cx, cy),
            inner:  makeRotorPath(ROTOR_TIPS[i], ROTOR_R * 0.28, pr, yr, rr, cx, cy),
            blades: makeBladeLines(ROTOR_TIPS[i], bladeAngle + i * Math.PI / 2, ROTOR_R * 0.92, pr, yr, rr, cx, cy),
            idx: i,
        }));

        const bodyPath  = makeBodyPath(BODY_R,        pr, yr, rr, cx, cy);
        const bodyInner = makeBodyPath(BODY_R * 0.55, pr, yr, rr, cx, cy);
        const centerPt  = proj(tf(origin, pr, yr, rr), cx, cy);
        const grid      = makeGroundGrid(pr, yr, rr, cx, cy);
        const reticle1  = makeReticlePath(cx, cy, 120, 24);
        const reticle2  = makeReticlePath(cx, cy, 68,  12);

        return { arms, rotors, bodyPath, bodyInner, centerPt, grid, reticle1, reticle2 };
    }, [pr, yr, rr, cx, cy, bladeAngle]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleArmToggle = async (value: boolean) => {
        if (!droneId || !localToken) return;
        setToggling(true);
        try {
            await (value ? droneProxyService.arm(droneId, localToken) : droneProxyService.disarm(droneId, localToken));
            setArmed(value);
        } catch (e) { console.error('[DroneControl] arm error:', e); }
        finally { setToggling(false); }
    };

    const handleTakeoff = async () => {
        if (!armed || !droneId || !localToken) return;
        setLaunching(true);
        try { await droneProxyService.takeoff(droneId, 3, localToken); }
        catch (e) { console.error('[DroneControl] takeoff error:', e); }
        finally { setLaunching(false); }
    };

    const handleLand = async () => {
        if (!armed || !droneId || !localToken) return;
        setLanding(true);
        try { await droneProxyService.land(droneId, localToken); }
        catch (e) { console.error('[DroneControl] land error:', e); }
        finally { setLanding(false); }
    };

    const handleSetMode = async (newMode: string) => {
        if (!droneId || !localToken || !connected || newMode === mode) return;
        setSettingMode(true);
        try {
            await droneProxyService.setMode(droneId, newMode, localToken);
            setMode(newMode);
        } catch (e) { console.error('[DroneControl] setMode error:', e); }
        finally { setSettingMode(false); }
    };

    // ── Colors ───────────────────────────────────────────────────────────────
    const accent      = armed ? C.armed : C.disarmed;
    const batteryColor = battery > 50 ? C.success : battery > 20 ? C.warning : C.danger;

    return (
        <View style={styles.root}>

            {/* ── Full-screen 3D canvas ── */}
            <Canvas style={StyleSheet.absoluteFill}>

                {/* Ground grid */}
                {geo.grid.map((p, i) => (
                    <Path key={`g${i}`} path={p} color={`${accent}12`} style="stroke" strokeWidth={1} />
                ))}

                {/* Outer reticle ring */}
                <Path path={geo.reticle1} color={`${accent}18`} style="stroke" strokeWidth={1} />
                {/* Inner reticle ring */}
                <Path path={geo.reticle2} color={`${accent}20`} style="stroke" strokeWidth={1} />

                {/* Crosshair */}
                {useMemo(() => {
                    const h = Skia.Path.Make(); h.moveTo(cx - 55, cy); h.lineTo(cx - 20, cy); h.moveTo(cx + 20, cy); h.lineTo(cx + 55, cy);
                    const v = Skia.Path.Make(); v.moveTo(cx, cy - 55); v.lineTo(cx, cy - 20); v.moveTo(cx, cy + 20); v.lineTo(cx, cy + 55);
                    return (
                        <>
                            <Path path={h} color={`${accent}35`} style="stroke" strokeWidth={1} />
                            <Path path={v} color={`${accent}35`} style="stroke" strokeWidth={1} />
                        </>
                    );
                }, [cx, cy, accent])}

                {/* Arms fill */}
                {geo.arms.map(arm => (
                    <Path key={`af${arm.idx}`} path={arm.path} color={`${accent}cc`} style="fill" />
                ))}
                {/* Arms edge */}
                {geo.arms.map(arm => (
                    <Path key={`ae${arm.idx}`} path={arm.path} color={`${accent}40`} style="stroke" strokeWidth={1} />
                ))}

                {/* Rotor disc glow */}
                {geo.rotors.map(r => (
                    <Path key={`dg${r.idx}`} path={r.disc} color={`${accent}14`} style="fill" />
                ))}
                {/* Rotor disc ring */}
                {geo.rotors.map(r => (
                    <Path key={`dr${r.idx}`} path={r.disc} color={`${accent}90`} style="stroke" strokeWidth={2} />
                ))}

                {/* Spinning blades */}
                {armed && geo.rotors.map(r =>
                    r.blades.map((b, bi) => (
                        <Path key={`bl${r.idx}${bi}`} path={b} color={`${accent}dd`} style="stroke" strokeWidth={3} strokeCap="round" />
                    ))
                )}

                {/* Motor hub */}
                {geo.rotors.map(r => (
                    <Path key={`mh${r.idx}`} path={r.inner} color={`${accent}50`} style="fill" />
                ))}

                {/* Body fill */}
                <Path path={geo.bodyPath}  color={`${accent}e0`} style="fill" />
                <Path path={geo.bodyPath}  color={accent}        style="stroke" strokeWidth={2.5} />
                <Path path={geo.bodyInner} color={`${accent}30`} style="fill" />

                {/* Center hub */}
                <Circle cx={geo.centerPt.x} cy={geo.centerPt.y} r={7}  color={armed ? `${C.success}60` : `${C.disarmed}80`} />
                <Circle cx={geo.centerPt.x} cy={geo.centerPt.y} r={3.5} color={armed ? C.success : '#3a6080'} />

            </Canvas>

            {/* ── HUD Overlay ── */}
            <SafeAreaView style={styles.overlay} pointerEvents="box-none">

                {/* Corner brackets */}
                <View style={[styles.corner, styles.cTL]} pointerEvents="none" />
                <View style={[styles.corner, styles.cTR]} pointerEvents="none" />
                <View style={[styles.cornerB, styles.cBL]} pointerEvents="none" />
                <View style={[styles.cornerB, styles.cBR]} pointerEvents="none" />

                {/* ── Floating Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                        <IconSymbol name="chevron.left" size={20} color={C.textBright} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>{droneName.toUpperCase()}</Text>
                        {mode ? <Text style={styles.modeText}>{mode.toUpperCase()}</Text> : null}
                    </View>

                    <View style={[styles.liveTag, !connected && styles.liveTagOff]}>
                        <View style={[styles.liveDot, !connected && styles.liveDotOff]} />
                        <Text style={[styles.liveText, !connected && styles.liveTextOff]}>
                            {connected ? 'LIVE' : 'OFF'}
                        </Text>
                    </View>
                </View>

                {/* ── Side PITCH gauge (left) ── */}
                <View style={styles.pitchGauge} pointerEvents="none">
                    <Text style={styles.gaugeLabel}>PITCH</Text>
                    <View style={styles.gaugeTrack}>
                        <View style={[styles.gaugeFill, {
                            height: `${Math.min(Math.abs(pitch) / 90 * 100, 100)}%`,
                            backgroundColor: `${C.armed}cc`,
                            bottom: pitch >= 0 ? '50%' : undefined,
                            top:    pitch <  0 ? '50%' : undefined,
                        }]} />
                        <View style={styles.gaugeMid} />
                    </View>
                    <Text style={styles.gaugeVal}>{pitch.toFixed(1)}°</Text>
                </View>

                {/* ── Side ROLL gauge (right) ── */}
                <View style={styles.rollGauge} pointerEvents="none">
                    <Text style={styles.gaugeLabel}>ROLL</Text>
                    <View style={styles.gaugeTrack}>
                        <View style={[styles.gaugeFill, {
                            height: `${Math.min(Math.abs(roll) / 90 * 100, 100)}%`,
                            backgroundColor: `${C.warning}cc`,
                            bottom: roll >= 0 ? '50%' : undefined,
                            top:    roll <  0 ? '50%' : undefined,
                        }]} />
                        <View style={styles.gaugeMid} />
                    </View>
                    <Text style={[styles.gaugeVal, { color: C.warning }]}>{roll.toFixed(1)}°</Text>
                </View>

                {/* ── Bottom Control Panel ── */}
                <View style={styles.bottomPanel}>

                    {/* Stats strip */}
                    <View style={styles.statsStrip}>
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>{yaw.toFixed(1)}°</Text>
                            <Text style={styles.statLbl}>YAW</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statVal, { color: C.success }]}>{altitude.toFixed(1)} m</Text>
                            <Text style={styles.statLbl}>ALTITUDE</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statVal, { color: batteryColor }]}>{battery}%</Text>
                            <Text style={styles.statLbl}>BATTERY</Text>
                        </View>
                    </View>

                    {/* Battery bar */}
                    <View style={styles.batteryBar}>
                        <View style={[styles.batteryFill, { width: `${battery}%` as any, backgroundColor: batteryColor }]} />
                    </View>

                    {/* ── Flight Mode Selector ── */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.modeScroll}
                    >
                        {FLIGHT_MODES.map(m => {
                            const isActive = mode.toUpperCase() === m;
                            return (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.modeChip, isActive && styles.modeChipActive]}
                                    onPress={() => handleSetMode(m)}
                                    disabled={!connected || settingMode}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.modeChipText, isActive && styles.modeChipTextActive]}>
                                        {m}
                                    </Text>
                                    {isActive && <View style={styles.modeActiveDot} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Arm row */}
                    <View style={styles.armRow}>
                        <View style={styles.armLeft}>
                            <View style={[styles.armDot, { backgroundColor: armed ? C.success : C.dim }]} />
                            <View>
                                <Text style={styles.armTitle}>{armed ? 'ARMED' : 'DISARMED'}</Text>
                                <Text style={styles.armSub}>Propulsion {armed ? 'enabled' : 'disabled'}</Text>
                            </View>
                        </View>
                        <Switch
                            value={armed}
                            onValueChange={handleArmToggle}
                            disabled={toggling || !connected}
                            trackColor={{ false: '#1a2e42', true: `${C.success}40` }}
                            thumbColor={armed ? C.success : '#3a5570'}
                        />
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.takeoffBtn, (!armed || !connected) && styles.btnDisabled]}
                            onPress={handleTakeoff}
                            disabled={!armed || !connected || launching}
                            activeOpacity={0.8}
                        >
                            <IconSymbol name="airplane" size={20} color={C.white} />
                            <Text style={styles.btnText}>{launching ? 'INITIATING...' : 'TAKE OFF'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.landBtn, (!armed || !connected) && styles.btnDisabled]}
                            onPress={handleLand}
                            disabled={!armed || !connected || landing}
                            activeOpacity={0.8}
                        >
                            <IconSymbol name="arrow.down.to.line" size={20} color={C.white} />
                            <Text style={styles.btnText}>{landing ? 'LANDING...' : 'LAND'}</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </SafeAreaView>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },

    // ── Corner brackets ──
    corner: {
        position: 'absolute',
        width: 22,
        height: 22,
        borderColor: C.armed,
        borderTopWidth: 2,
        opacity: 0.6,
    },
    cornerB: {
        position: 'absolute',
        width: 22,
        height: 22,
        borderColor: C.armed,
        borderBottomWidth: 2,
        opacity: 0.6,
    },
    cTL: { top: 56, left: 16, borderLeftWidth: 2 },
    cTR: { top: 56, right: 16, borderRightWidth: 2 },
    cBL: { bottom: 12, left: 16, borderLeftWidth: 2 },
    cBR: { bottom: 12, right: 16, borderRightWidth: 2 },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 10,
        backgroundColor: 'rgba(2,11,24,0.72)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,229,255,0.12)',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,229,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,229,255,0.06)',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: C.textBright,
        letterSpacing: 2.5,
    },
    modeText: {
        fontSize: 10,
        fontWeight: '600',
        color: C.armed,
        letterSpacing: 1.5,
        marginTop: 2,
    },
    liveTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: `${C.success}18`,
        borderWidth: 1,
        borderColor: `${C.success}30`,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    liveTagOff: {
        backgroundColor: `${C.dim}18`,
        borderColor: `${C.dim}30`,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.success,
    },
    liveDotOff: {
        backgroundColor: C.dim,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '800',
        color: C.success,
        letterSpacing: 1.5,
    },
    liveTextOff: {
        color: C.dim,
    },

    // ── Side gauges ──
    pitchGauge: {
        position: 'absolute',
        left: 16,
        top: '28%',
        alignItems: 'center',
        gap: 4,
    },
    rollGauge: {
        position: 'absolute',
        right: 16,
        top: '28%',
        alignItems: 'center',
        gap: 4,
    },
    gaugeLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: C.textDim,
        letterSpacing: 1.5,
    },
    gaugeTrack: {
        width: 6,
        height: 80,
        backgroundColor: 'rgba(0,229,255,0.08)',
        borderRadius: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,229,255,0.15)',
        position: 'relative',
    },
    gaugeFill: {
        position: 'absolute',
        left: 0,
        right: 0,
        borderRadius: 3,
    },
    gaugeMid: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        top: '50%',
        backgroundColor: 'rgba(0,229,255,0.35)',
    },
    gaugeVal: {
        fontSize: 10,
        fontWeight: '700',
        color: C.armed,
        letterSpacing: 0.5,
    },

    // ── Bottom panel ──
    bottomPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: C.glass,
        borderTopWidth: 1,
        borderTopColor: C.glassBorder,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 14,
    },

    // Stats
    statsStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statVal: {
        fontSize: 18,
        fontWeight: '700',
        color: C.textBright,
        letterSpacing: 0.5,
    },
    statLbl: {
        fontSize: 9,
        fontWeight: '700',
        color: C.textDim,
        letterSpacing: 1.5,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: 'rgba(0,229,255,0.15)',
    },

    // Battery bar
    batteryBar: {
        height: 3,
        backgroundColor: 'rgba(0,229,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    batteryFill: {
        height: '100%',
        borderRadius: 2,
    },

    // Arm row
    armRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(0,229,255,0.04)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,229,255,0.1)',
    },
    armLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    armDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    armTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: C.textBright,
        letterSpacing: 1.5,
    },
    armSub: {
        fontSize: 10,
        color: C.textDim,
        marginTop: 1,
    },

    // Action buttons
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 12,
        paddingVertical: 15,
        borderWidth: 1,
    },
    takeoffBtn: {
        backgroundColor: 'rgba(0,229,255,0.14)',
        borderColor: `${C.armed}60`,
    },
    landBtn: {
        backgroundColor: 'rgba(0,255,157,0.10)',
        borderColor: `${C.success}50`,
    },
    btnDisabled: {
        backgroundColor: 'rgba(40,60,80,0.4)',
        borderColor: 'rgba(40,60,80,0.6)',
    },
    btnText: {
        fontSize: 13,
        fontWeight: '800',
        color: C.white,
        letterSpacing: 1.5,
    },

    // ── Mode selector ──
    modeScroll: {
        gap: 8,
        paddingVertical: 2,
    },
    modeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,229,255,0.18)',
        backgroundColor: 'rgba(0,229,255,0.04)',
    },
    modeChipActive: {
        borderColor: C.armed,
        backgroundColor: 'rgba(0,229,255,0.15)',
    },
    modeChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: C.textDim,
        letterSpacing: 1.2,
    },
    modeChipTextActive: {
        color: C.armed,
    },
    modeActiveDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: C.armed,
    },
});
