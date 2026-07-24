import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';

const SAFE_COLORS = ['#20ff8a', '#26d9ff', '#fff02b', '#d75cff', '#ff9d22', '#ffffff', '#53ff3d'];
const RED_COLOR = '#ff1744';
const MAX_MISSES = 3;
const MISS_GRACE_MS = 130;

const THEMES = [
  {
    id: 'crt',
    name: 'CRT Green',
    bg: '#020807',
    bg2: '#06231a',
    panel: '#071911',
    tile: '#092319',
    line: '#14ff8a',
    text: '#e9fff5',
    muted: '#74d6a4',
    accent: '#17ff8a',
    accent2: '#f4ff5c',
    shadow: '#0dff75'
  },
  {
    id: 'synth',
    name: 'Synthwave',
    bg: '#130022',
    bg2: '#320755',
    panel: '#23053d',
    tile: '#2d0b4f',
    line: '#ff4fd8',
    text: '#fff2ff',
    muted: '#d3a2ff',
    accent: '#ff4fd8',
    accent2: '#27e8ff',
    shadow: '#ff2bcb'
  },
  {
    id: 'amber',
    name: 'Amber Cabinet',
    bg: '#120902',
    bg2: '#361800',
    panel: '#211007',
    tile: '#2a170b',
    line: '#ffb02e',
    text: '#fff5dd',
    muted: '#d7a964',
    accent: '#ffb02e',
    accent2: '#ffea70',
    shadow: '#ff8a00'
  },
  {
    id: 'blue',
    name: 'Vector Blue',
    bg: '#020817',
    bg2: '#041b40',
    panel: '#07142d',
    tile: '#0b1d3d',
    line: '#39d7ff',
    text: '#effcff',
    muted: '#8bc9e6',
    accent: '#39d7ff',
    accent2: '#ffef5e',
    shadow: '#169cff'
  }
];

function randomIndex(max) {
  return Math.floor(Math.random() * max);
}

function formatMode(mode) {
  return mode === 'hard' ? 'Hard' : 'Easy';
}

function lightDuration(score, mode) {
  const start = mode === 'hard' ? 1040 : 1280;
  const earlyDrop = Math.min(score, 30) * 16;
  const lateDrop = Math.max(score - 30, 0) * 7;
  return Math.max(mode === 'hard' ? 520 : 640, start - earlyDrop - lateDrop);
}

function gapDuration(score) {
  return Math.max(180, 360 - score * 5);
}

export default function App() {
  const timerRef = useRef(null);
  const missesRef = useRef(0);
  const runningRef = useRef(false);
  const activeIndexRef = useRef(-1);
  const activeKindRef = useRef('safe');
  const acceptingInputRef = useRef(false);
  const drift = useRef(new Animated.Value(0)).current;
  const glitch = useRef(new Animated.Value(0)).current;
  const alarm = useRef(new Animated.Value(0)).current;
  const [screen, setScreen] = useState('home');
  const [themeId, setThemeId] = useState('crt');
  const [mode, setMode] = useState('easy');
  const [leaderboards, setLeaderboards] = useState({ easy: [], hard: [] });
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeKind, setActiveKind] = useState('safe');
  const [activeColor, setActiveColor] = useState(SAFE_COLORS[0]);
  const [message, setMessage] = useState('Insert coin');
  const [running, setRunning] = useState(false);
  const [lastGameOver, setLastGameOver] = useState('');
  const [alarmText, setAlarmText] = useState('MISS');

  const theme = useMemo(() => THEMES.find((item) => item.id === themeId) || THEMES[0], [themeId]);
  const boardSize = Math.min(Dimensions.get('window').width - 42, 386);
  const cellSize = Math.floor((boardSize - 22) / 3);
  const speed = (1250 / lightDuration(score, mode)).toFixed(1);

  useEffect(() => {
    Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glitch, { toValue: 1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(glitch, { toValue: 0, duration: 140, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(glitch, { toValue: 1, duration: 45, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(glitch, { toValue: 0, duration: 80, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1400)
      ])
    ).start();

    return () => clearTimer();
  }, [alarm, drift, glitch]);

  useEffect(() => {
    missesRef.current = misses;
  }, [misses]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function goTo(nextScreen) {
    clearTimer();
    acceptingInputRef.current = false;
    runningRef.current = false;
    setRunning(false);
    clearActiveTile();
    setScreen(nextScreen);
  }

  function setActiveTile(index, kind, color) {
    activeIndexRef.current = index;
    activeKindRef.current = kind;
    acceptingInputRef.current = true;
    setActiveIndex(index);
    setActiveKind(kind);
    setActiveColor(color);
  }

  function clearActiveTile() {
    activeIndexRef.current = -1;
    activeKindRef.current = 'safe';
    acceptingInputRef.current = false;
    setActiveIndex(-1);
  }

  function triggerAlarm(text) {
    setAlarmText(text);
    alarm.stopAnimation();
    alarm.setValue(0);
    Animated.sequence([
      Animated.timing(alarm, { toValue: 1, duration: 55, easing: Easing.linear, useNativeDriver: true }),
      Animated.delay(260),
      Animated.timing(alarm, { toValue: 0, duration: 140, easing: Easing.linear, useNativeDriver: true })
    ]).start();
  }

  function startGame(nextMode) {
    clearTimer();
    missesRef.current = 0;
    runningRef.current = true;
    acceptingInputRef.current = false;
    setMode(nextMode);
    setScore(0);
    setMisses(0);
    clearActiveTile();
    setActiveKind('safe');
    setActiveColor(SAFE_COLORS[0]);
    setLastGameOver('');
    setMessage(nextMode === 'hard' ? 'Tap colors. Never red.' : 'Tap the light.');
    setScreen('game');
    setRunning(true);
    timerRef.current = setTimeout(() => nextTurn(0, nextMode), 620);
  }

  function nextTurn(currentScore = score, currentMode = mode) {
    clearTimer();
    if (!runningRef.current) return;
    const isTrap = currentMode === 'hard' && Math.random() < Math.min(0.29 + currentScore * 0.006, 0.46);
    const nextIndex = randomIndex(9);
    const nextColor = isTrap ? RED_COLOR : SAFE_COLORS[randomIndex(SAFE_COLORS.length)];

    setActiveTile(nextIndex, isTrap ? 'trap' : 'safe', nextColor);
    setMessage(isTrap ? 'Wait' : 'Tap');

    timerRef.current = setTimeout(() => {
      acceptingInputRef.current = false;
      timerRef.current = setTimeout(() => expireLight(isTrap, currentScore, currentMode), MISS_GRACE_MS);
    }, lightDuration(currentScore, currentMode));
  }

  function expireLight(isTrap, currentScore, currentMode) {
      if (!runningRef.current) return;
      if (isTrap) {
        clearActiveTile();
        setMessage('Dodge');
        timerRef.current = setTimeout(() => nextTurn(currentScore, currentMode), gapDuration(currentScore));
        return;
      }

      const nextMisses = missesRef.current + 1;
      missesRef.current = nextMisses;
      triggerAlarm('MISS');
      if (nextMisses >= MAX_MISSES) {
        setMisses(MAX_MISSES);
        endGame('Three missed lights', currentScore, currentMode);
        return;
      }

      setMisses(nextMisses);
      clearActiveTile();
      setMessage(`Miss ${nextMisses}/${MAX_MISSES}`);
      timerRef.current = setTimeout(() => nextTurn(currentScore, currentMode), gapDuration(currentScore));
  }

  function endGame(reason, finalScore = score, finalMode = mode) {
    clearTimer();
    runningRef.current = false;
    acceptingInputRef.current = false;
    setRunning(false);
    clearActiveTile();
    setLastGameOver(reason);
    setMessage(`${reason}. Score ${finalScore}`);
    setLeaderboards((current) => {
      const next = {
        easy: current.easy.slice(),
        hard: current.hard.slice()
      };
      next[finalMode].push({ score: finalScore, date: new Date().toLocaleDateString() });
      next[finalMode].sort((a, b) => b.score - a.score);
      next[finalMode] = next[finalMode].slice(0, 8);
      return next;
    });
  }

  function pressTile(index) {
    if (!runningRef.current || !acceptingInputRef.current || activeIndexRef.current !== index) return;
    clearTimer();
    acceptingInputRef.current = false;

    if (activeKindRef.current === 'trap') {
      endGame('You tapped red');
      return;
    }

    const nextScore = score + 1;
    setScore(nextScore);
    clearActiveTile();
    setMessage(nextScore % 10 === 0 ? 'Speed up' : 'Hit');
    timerRef.current = setTimeout(() => nextTurn(nextScore, mode), gapDuration(nextScore));
  }

  function renderBackdrop() {
    const shift = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 42] });
    const glitchShift = glitch.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });

    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.gridBackdrop,
            {
              borderColor: theme.line,
              transform: [{ translateY: shift }, { translateX: glitchShift }]
            }
          ]}>
          {Array.from({ length: 18 }).map((_, index) => (
            <View key={`h-${index}`} style={[styles.gridLineH, { backgroundColor: theme.line, top: index * 34 }]} />
          ))}
          {Array.from({ length: 12 }).map((_, index) => (
            <View key={`v-${index}`} style={[styles.gridLineV, { backgroundColor: theme.line, left: index * 36 }]} />
          ))}
        </Animated.View>
        <View style={[styles.glowDisk, { backgroundColor: theme.bg2 }]} />
        <View style={styles.scanlines}>
          {Array.from({ length: 28 }).map((_, index) => (
            <View key={`scan-${index}`} style={styles.scanline} />
          ))}
        </View>
      </View>
    );
  }

  function renderAlarm() {
    const opacity = alarm.interpolate({ inputRange: [0, 1], outputRange: [0, 0.86] });
    const scale = alarm.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

    return (
      <Animated.View pointerEvents="none" style={[styles.alarmOverlay, { opacity, transform: [{ scale }] }]}>
        <View style={styles.alarmBars}>
          {Array.from({ length: 7 }).map((_, index) => (
            <View key={`alarm-${index}`} style={styles.alarmBar} />
          ))}
        </View>
        <Text style={styles.alarmText}>{alarmText}</Text>
        <Text style={styles.alarmSub}>SIGNAL LOST</Text>
      </Animated.View>
    );
  }

  function renderButton(label, onPress, filled = false) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.arcadeButton,
          {
            backgroundColor: filled ? theme.accent : theme.panel,
            borderColor: filled ? theme.accent2 : theme.line,
            shadowColor: theme.shadow
          },
          pressed && styles.pressed
        ]}>
        <Text style={[styles.arcadeButtonText, { color: filled ? '#080808' : theme.text }]}>{label}</Text>
      </Pressable>
    );
  }

  function renderGlitchTitle(size = 'large') {
    const offsetA = glitch.interpolate({ inputRange: [0, 1], outputRange: [-2, 5] });
    const offsetB = glitch.interpolate({ inputRange: [0, 1], outputRange: [2, -5] });
    return (
      <View style={styles.titleStack}>
        <Animated.Text
          style={[
            size === 'large' ? styles.retroTitleShadow : styles.pageTitleShadow,
            { color: theme.accent, transform: [{ translateX: offsetA }] }
          ]}>
          FLEX
        </Animated.Text>
        <Animated.Text
          style={[
            size === 'large' ? styles.retroTitleShadow : styles.pageTitleShadow,
            { color: RED_COLOR, transform: [{ translateX: offsetB }], opacity: 0.75 }
          ]}>
          FLEX
        </Animated.Text>
        <Text style={[size === 'large' ? styles.retroTitle : styles.pageTitle, { color: theme.text }]}>FLEX</Text>
      </View>
    );
  }

  function renderHome() {
    return (
      <View style={styles.home}>
        <Text style={[styles.insertText, { color: theme.accent2 }]}>1987 REACTION CABINET</Text>
        {renderGlitchTitle('large')}
        <Text style={[styles.homeSub, { color: theme.muted }]}>HIGH VOLTAGE TAP TEST</Text>
        <View style={styles.homeButtons}>
          {renderButton('PLAY', () => goTo('mode'), true)}
          {renderButton('SETTINGS', () => goTo('settings'))}
          {renderButton('LEADERBOARDS', () => goTo('leaderboard'))}
        </View>
      </View>
    );
  }

  function renderModeSelect() {
    return (
      <View style={styles.page}>
        <Text style={[styles.pageEyebrow, { color: theme.accent2 }]}>SELECT MODE</Text>
        <View style={styles.modeSelectCards}>
          <Pressable
            onPress={() => startGame('easy')}
            style={({ pressed }) => [
              styles.bigModeCard,
              { backgroundColor: theme.panel, borderColor: theme.line, shadowColor: theme.shadow },
              pressed && styles.pressed
            ]}>
            <Text style={[styles.bigModeTitle, { color: theme.accent }]}>EASY</Text>
            <Text style={[styles.bigModeCopy, { color: theme.muted }]}>Tap every light before it blanks.</Text>
          </Pressable>
          <Pressable
            onPress={() => startGame('hard')}
            style={({ pressed }) => [
              styles.bigModeCard,
              { backgroundColor: theme.panel, borderColor: RED_COLOR, shadowColor: RED_COLOR },
              pressed && styles.pressed
            ]}>
            <Text style={[styles.bigModeTitle, { color: RED_COLOR }]}>HARD</Text>
            <Text style={[styles.bigModeCopy, { color: theme.muted }]}>Tap colors. Red ends the run.</Text>
          </Pressable>
        </View>
        {renderButton('BACK', () => goTo('home'))}
      </View>
    );
  }

  function renderStat(label, value) {
    return (
      <View style={[styles.stat, { backgroundColor: theme.panel, borderColor: theme.line }]}>
        <Text style={[styles.statValue, { color: theme.accent2 }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
      </View>
    );
  }

  function renderGame() {
    const tiles = [];
    for (let index = 0; index < 9; index += 1) {
      const active = activeIndex === index;
      tiles.push(
        <Pressable
          key={index}
          onPressIn={() => pressTile(index)}
          style={({ pressed }) => [
            styles.tile,
            {
              width: cellSize,
              height: cellSize,
              backgroundColor: active ? activeColor : theme.tile,
              borderColor: active ? '#ffffff' : theme.line,
              shadowColor: active ? activeColor : theme.shadow
            },
            active && styles.tileLit,
            pressed && styles.pressed
          ]}>
          <Text style={[styles.tileGlyph, { color: active ? '#080808' : theme.line }]}>{active ? '!' : '+'}</Text>
        </Pressable>
      );
    }

    return (
      <View style={styles.game}>
        <View style={styles.topBar}>
          <Pressable onPress={() => goTo('home')}>
            <Text style={[styles.navText, { color: theme.accent }]}>HOME</Text>
          </Pressable>
          <Text style={[styles.navTitle, { color: theme.text }]}>{formatMode(mode).toUpperCase()}</Text>
        </View>

        <View style={styles.stats}>
          {renderStat('score', score)}
          {renderStat('miss', `${misses}/${MAX_MISSES}`)}
          {renderStat('spd', `${speed}x`)}
        </View>

        <Text style={[styles.message, { color: theme.accent2 }]}>{message.toUpperCase()}</Text>
        <View style={[styles.cabinet, { borderColor: theme.line, backgroundColor: theme.panel }]}>
          <View style={[styles.grid, { width: boardSize, height: boardSize }]}>{tiles}</View>
        </View>

        {!running ? (
          <View style={styles.resultPanel}>
            <Text style={[styles.resultTitle, { color: theme.text }]}>SCORE {score}</Text>
            <Text style={[styles.resultCopy, { color: theme.muted }]}>{lastGameOver.toUpperCase() || 'GAME OVER'}</Text>
            {renderButton('PLAY AGAIN', () => startGame(mode), true)}
            {renderButton('LEADERBOARDS', () => goTo('leaderboard'))}
          </View>
        ) : (
          <View style={styles.quit}>{renderButton('QUIT', () => goTo('home'))}</View>
        )}
      </View>
    );
  }

  function renderSettings() {
    return (
      <View style={styles.page}>
        <Text style={[styles.pageEyebrow, { color: theme.accent2 }]}>CABINET SKINS</Text>
        {renderGlitchTitle('small')}
        <View style={styles.themeList}>
          {THEMES.map((item) => {
            const selected = item.id === themeId;
            return (
              <Pressable
                key={item.id}
                onPress={() => setThemeId(item.id)}
                style={({ pressed }) => [
                  styles.themeChoice,
                  {
                    backgroundColor: item.panel,
                    borderColor: selected ? item.accent2 : item.line,
                    shadowColor: item.shadow
                  },
                  pressed && styles.pressed
                ]}>
                <View style={[styles.swatch, { backgroundColor: item.accent, borderColor: item.accent2 }]} />
                <Text style={[styles.themeName, { color: item.text }]}>{item.name.toUpperCase()}</Text>
                <Text style={[styles.themeMark, { color: item.accent2 }]}>{selected ? 'ON' : ''}</Text>
              </Pressable>
            );
          })}
        </View>
        {renderButton('BACK', () => goTo('home'))}
      </View>
    );
  }

  function renderLeaderboard() {
    return (
      <View style={styles.page}>
        <Text style={[styles.pageEyebrow, { color: theme.accent2 }]}>TOP SCORES</Text>
        <Text style={[styles.boardHeader, { color: theme.text }]}>LEADERBOARDS</Text>
        {renderBoard('easy')}
        {renderBoard('hard')}
        {renderButton('CLEAR SCORES', () => setLeaderboards({ easy: [], hard: [] }))}
        {renderButton('BACK', () => goTo('home'))}
      </View>
    );
  }

  function renderBoard(boardMode) {
    const rows = leaderboards[boardMode] || [];
    return (
      <View style={[styles.board, { backgroundColor: theme.panel, borderColor: theme.line }]}>
        <Text style={[styles.boardTitle, { color: theme.accent }]}>{formatMode(boardMode).toUpperCase()}</Text>
        {rows.length === 0 ? (
          <Text style={[styles.empty, { color: theme.muted }]}>NO SCORES</Text>
        ) : (
          rows.map((row, index) => (
            <View key={`${boardMode}-${index}`} style={styles.scoreRow}>
              <Text style={[styles.rank, { color: theme.accent2 }]}>#{index + 1}</Text>
              <Text style={[styles.score, { color: theme.text }]}>{row.score}</Text>
              <Text style={[styles.date, { color: theme.muted }]}>{row.date}</Text>
            </View>
          ))
        )}
      </View>
    );
  }

  let content = renderHome();
  if (screen === 'mode') content = renderModeSelect();
  if (screen === 'game') content = renderGame();
  if (screen === 'settings') content = renderSettings();
  if (screen === 'leaderboard') content = renderLeaderboard();

  return (
    <SafeAreaView style={[styles.app, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />
      {renderBackdrop()}
      {content}
      {renderAlarm()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 18,
    overflow: 'hidden'
  },
  gridBackdrop: {
    position: 'absolute',
    left: -36,
    right: -36,
    top: -42,
    bottom: -42,
    opacity: 0.12,
    borderWidth: 1
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1
  },
  glowDisk: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.7
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.13,
    justifyContent: 'space-between'
  },
  scanline: {
    height: 2,
    backgroundColor: '#ffffff'
  },
  alarmOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: '#d50000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  alarmBars: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-around'
  },
  alarmBar: {
    height: 24,
    backgroundColor: '#7a0000',
    opacity: 0.38
  },
  alarmText: {
    color: '#ffffff',
    fontSize: 64,
    lineHeight: 70,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center'
  },
  alarmSub: {
    color: '#ffe45e',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 4
  },
  home: {
    flex: 1,
    justifyContent: 'center'
  },
  insertText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 14
  },
  titleStack: {
    minHeight: 132,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  retroTitle: {
    fontSize: 58,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center'
  },
  retroTitleShadow: {
    position: 'absolute',
    fontSize: 58,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
    opacity: 0.78
  },
  pageTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center'
  },
  pageTitleShadow: {
    position: 'absolute',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
    opacity: 0.75
  },
  homeSub: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 28
  },
  homeButtons: {
    marginTop: 8
  },
  arcadeButton: {
    minHeight: 58,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowOpacity: 0.65,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5
  },
  arcadeButtonText: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.84
  },
  page: {
    flex: 1,
    justifyContent: 'center'
  },
  pageEyebrow: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8
  },
  modeSelectCards: {
    marginTop: 10,
    marginBottom: 18
  },
  bigModeCard: {
    minHeight: 122,
    borderRadius: 4,
    borderWidth: 2,
    padding: 18,
    justifyContent: 'center',
    marginBottom: 14,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4
  },
  bigModeTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8
  },
  bigModeCopy: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800'
  },
  game: {
    flex: 1,
    justifyContent: 'center'
  },
  topBar: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  navText: {
    fontSize: 16,
    fontWeight: '900'
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '900'
  },
  stats: {
    flexDirection: 'row',
    marginBottom: 12
  },
  stat: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 2,
    padding: 10,
    marginHorizontal: 3
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900'
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 2
  },
  message: {
    minHeight: 28,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12
  },
  cabinet: {
    alignSelf: 'center',
    borderWidth: 3,
    borderRadius: 6,
    padding: 8
  },
  grid: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between'
  },
  tile: {
    borderRadius: 3,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3
  },
  tileLit: {
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 7
  },
  tileGlyph: {
    fontSize: 32,
    fontWeight: '900'
  },
  quit: {
    marginTop: 20
  },
  resultPanel: {
    marginTop: 20
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center'
  },
  resultCopy: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14
  },
  themeList: {
    marginTop: 8,
    marginBottom: 16
  },
  themeChoice: {
    minHeight: 62,
    borderRadius: 4,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowOpacity: 0.34,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 2,
    borderWidth: 2,
    marginRight: 12
  },
  themeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900'
  },
  themeMark: {
    width: 34,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '900'
  },
  boardHeader: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16
  },
  board: {
    borderRadius: 4,
    borderWidth: 2,
    padding: 14,
    marginBottom: 12
  },
  boardTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8
  },
  empty: {
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 8
  },
  scoreRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center'
  },
  rank: {
    width: 44,
    fontSize: 14,
    fontWeight: '900'
  },
  score: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900'
  },
  date: {
    fontSize: 13,
    fontWeight: '800'
  }
});
