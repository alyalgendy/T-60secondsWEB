import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { MissionPlan, PlanningSceneProps, ResourceKey } from '../../shared/types';
import {
  RESOURCE_ORDER,
  getLaunchBlockers,
  scorePlan,
  toReservePercent,
} from '../../shared/scoring';
import {
  FactCard,
  GaugeBar,
  HudButton,
  HudPanel,
  HudShell,
  MissionViz,
  PlayerBadge,
  ReadyBar,
  ResourceSlider,
  StatusPill,
} from '../../shared/ui';
import { MarkerSlot } from '../../components/MarkerBadge';
import { getMoonMarkers } from '../../lib/markers';
import { missionConfig as config } from './config';
import styles from './MoonScene.module.css';

const RISK_LABEL = {
  low: { glyph: '✓', text: 'low risk', className: styles.riskLow },
  medium: { glyph: '▲', text: 'medium risk', className: styles.riskMedium },
  high: { glyph: '✕', text: 'high risk', className: styles.riskHigh },
} as const;

function errorText(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'That change did not reach the room. Check your connection and try again.';
}

function scoreTone(score: number): { tone: 'ok' | 'warn' | 'danger'; label: string } {
  if (score >= 80) return { tone: 'ok', label: 'Strong plan' };
  if (score >= 60) return { tone: 'warn', label: 'Workable' };
  return { tone: 'danger', label: 'Risky' };
}

export default function MoonScene({
  roomCode,
  me,
  players,
  draft,
  updateDraft,
  toggleReady,
  launch,
}: PlanningSceneProps) {
  const [busy, setBusy] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedKey, setEditedKey] = useState<ResourceKey | null>(null);
  const [craftEdited, setCraftEdited] = useState(false);

  const previousResources = useRef(draft.resources);
  const previousCraft = useRef(draft.craftId);

  useEffect(() => {
    const changedKey = RESOURCE_ORDER.find(
      (key) => draft.resources[key] !== previousResources.current[key],
    );
    if (changedKey) {
      setEditedKey(changedKey);
      setCraftEdited(false);
    }
    if (draft.craftId !== previousCraft.current) {
      setCraftEdited(true);
      setEditedKey(null);
    }
    previousResources.current = draft.resources;
    previousCraft.current = draft.craftId;
  }, [draft.resources, draft.craftId]);

  const scorePreview = useMemo(() => scorePlan(config, draft), [draft]);
  const launchBlockers = useMemo(
    () => getLaunchBlockers(config, draft),
    [draft],
  );

  const selectedCraft = config.crafts.find((craft) => craft.id === draft.craftId);
  const iAmReady = draft.readyPlayerIds.includes(me.id);
  const controlsDisabled = iAmReady;
  const connected = players.filter((player) => player.connected);
  const readyCount = connected.filter((player) =>
    draft.readyPlayerIds.includes(player.id),
  ).length;
  const allReady = connected.length > 0 && readyCount === connected.length;
  const markers = useMemo(
    () => getMoonMarkers({ config, draft, players, youId: me.id }),
    [draft, players, me.id],
  );
  const launchVisible = me.isHost && allReady;
  const canLaunch = launchVisible && launchBlockers.length === 0 && !launching;
  const lastEditor =
    draft.lastEditedBy && draft.lastEditedBy !== me.id
      ? players.find((player) => player.id === draft.lastEditedBy) ?? null
      : null;

  const blockers: string[] = [];
  if (launchBlockers.length > 0) blockers.push(...launchBlockers);
  if (!allReady) {
    const waiting = connected.length - readyCount;
    blockers.push(
      `Waiting for ${waiting} crew ${waiting === 1 ? 'member' : 'members'} to lock in.`,
    );
  }
  if (!me.isHost) blockers.push('Only the host can launch the mission.');

  const tone = scoreTone(scorePreview.score);

  async function handleResourceChange(key: ResourceKey, value: number): Promise<void> {
    setError(null);
    try {
      await updateDraft({ resources: { ...draft.resources, [key]: value } });
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function handleCraftChange(craftId: string): Promise<void> {
    setError(null);
    try {
      await updateDraft({ craftId });
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function handleToggleReady(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await toggleReady();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleLaunch(): Promise<void> {
    if (!canLaunch) return;
    setLaunching(true);
    setError(null);
    const plan: MissionPlan = {
      missionId: config.id,
      craftId: draft.craftId,
      resources: draft.resources,
      massUsed: scorePreview.massUsed,
      massBudget: scorePreview.massBudget,
      score: scorePreview.score,
      lockedAt: Date.now(),
    };
    try {
      await launch(plan);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setLaunching(false);
    }
  }

  return (
    <HudShell
      missionTitle="Mission 2 · Moon"
      stepLabel="Mission planning"
      roomCode={roomCode}
      players={players}
      me={me}
      headerAside={<StatusPill tone="info">Draft live</StatusPill>}
    >
      <div className={styles.grid}>
        <HudPanel
          title="Mission Brief"
          subtitle="Artemis: back to the lunar surface"
          className={styles.brief}
          scroll
        >
          <div id="moon-brief">
            <MarkerSlot markers={markers} anchor="moon-brief" />
          </div>
          <div className={styles.destination}>
            <span className={styles.planet} aria-hidden="true" />
            <div>
              <span className={styles.eyebrow}>Destination</span>
              <h1 className={styles.destinationName}>{config.destination}</h1>
              <p className={styles.destinationMeta}>
                Mission 02 · {config.durationDays} days on the surface
              </p>
            </div>
          </div>

          <div className={styles.goal}>
            <span className={styles.sectionLabel}>Mission goal</span>
            <p className={styles.goalText}>{config.goal}</p>
          </div>

          <div className={styles.factList}>
            {config.facts.map((fact, index) => (
              <FactCard
                key={`${fact.source.url}-${index}`}
                fact={fact}
                index={index}
              />
            ))}
          </div>

          <p className={styles.gameNote}>
            Reserve sliders show coverage of the mission-specific cap. Lander
            capacity and cost are game-balance points, not real vehicle figures.
          </p>
        </HudPanel>

        <HudPanel
          title="Plan Builder"
          subtitle="Pick a lander, then cover every need"
          className={styles.builder}
          bodyClassName={styles.builderBody}
          scroll
        >
          <div id="moon-craft" className={styles.blockHead}>
            <span className={styles.sectionLabel}>01 · Choose a lander</span>
            {craftEdited && lastEditor ? (
              <span className={styles.editFlag}>
                <PlayerBadge player={lastEditor} size="sm" showName={false} />
                <span>{lastEditor.name} chose this</span>
              </span>
            ) : null}
          </div>
          <MarkerSlot markers={markers} anchor="moon-craft" />

          <fieldset className={styles.craftGrid} disabled={controlsDisabled}>
            <legend className={styles.srOnly}>Choose one lander</legend>
            {config.crafts.map((craft) => {
              const selected = draft.craftId === craft.id;
              return (
                <label
                  key={craft.id}
                  className={clsx(styles.craftCard, selected && styles.craftSelected)}
                >
                  <input
                    className={styles.srOnly}
                    type="radio"
                    name="craft"
                    value={craft.id}
                    checked={selected}
                    onChange={() => {
                      void handleCraftChange(craft.id);
                    }}
                    aria-label={`${craft.name}: ${craft.massCapacity} loadout points, ${craft.crewCapacity} crew. Pros: ${craft.pros.join(
                      ', ',
                    )}. Cons: ${craft.cons.join(', ')}.`}
                  />
                  <span className={styles.craftHead}>
                    <span className={styles.craftName}>{craft.name}</span>
                    <span className={styles.craftCheck} aria-hidden="true">
                      {selected ? '✓' : '○'}
                    </span>
                  </span>
                  <span className={styles.craftStats}>
                    <span>
                      Loadout <b>{craft.massCapacity} pts</b>
                    </span>
                    <span>
                      Crew <b>{craft.crewCapacity}</b>
                    </span>
                    {selected ? (
                      <span className={styles.selectedTag}>Selected</span>
                    ) : null}
                  </span>
                  <span className={styles.craftMeta}>
                    {craft.risk ? (
                      <span
                        className={clsx(styles.risk, RISK_LABEL[craft.risk].className)}
                      >
                        <span aria-hidden="true">{RISK_LABEL[craft.risk].glyph}</span>
                        {RISK_LABEL[craft.risk].text}
                      </span>
                    ) : null}
                    {typeof craft.cost === 'number' ? (
                      <span title="Game balance only, not a real price">
                        Cost <b>{craft.cost}</b> game points
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.craftDesc}>{craft.description}</span>
                  <span className={styles.tradeoffs}>
                    <span className={styles.pro}>+ {craft.pros.join(' · ')}</span>
                    <span className={styles.con}>− {craft.cons.join(' · ')}</span>
                  </span>
                  {craft.source ? (
                    <a
                      className={styles.sourceLink}
                      href={craft.source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {craft.source.title} ↗
                    </a>
                  ) : null}
                </label>
              );
            })}
          </fieldset>

          <div id="moon-resources" className={styles.blockHead}>
            <span className={styles.sectionLabel}>02 · Allocate resources</span>
            {editedKey && lastEditor ? (
              <span className={styles.editFlag}>
                <PlayerBadge player={lastEditor} size="sm" showName={false} />
                <span>{lastEditor.name} edited</span>
              </span>
            ) : null}
          </div>
          <MarkerSlot markers={markers} anchor="moon-resources" />

          <div className={styles.sliders}>
            {config.needs.map((need) => (
              <ResourceSlider
                key={need.key}
                need={need}
                value={draft.resources[need.key]}
                disabled={controlsDisabled}
                editor={editedKey === need.key ? lastEditor : null}
                onChange={(value) => {
                  void handleResourceChange(need.key, value);
                }}
              />
            ))}
          </div>

          {controlsDisabled ? (
            <p className={styles.lockNote}>
              Your plan is locked. Press <strong>Unlock plan</strong> to edit again.
            </p>
          ) : null}

          {error ? (
            <p className={styles.error} role="alert">
              <span aria-hidden="true">▲ </span>
              {error}
            </p>
          ) : null}
        </HudPanel>

        <HudPanel
          title="Mission Status"
          subtitle="Mission profile, score and reserve coverage"
          className={styles.status}
          scroll
        >
          <MissionViz
            config={config}
            crewCount={players.length}
            resources={draft.resources}
            phase="Preflight"
          />
          <div id="moon-status">
            <MarkerSlot markers={markers} anchor="moon-status" />
          </div>
          <GaugeBar
            label="Loadout used"
            value={scorePreview.massUsed}
            max={scorePreview.massBudget}
            limit="atMost"
            unit="points"
            hint={
              selectedCraft
                ? `${selectedCraft.name} game budget: ${selectedCraft.massCapacity} points`
                : 'Select a lander to unlock its game loadout budget'
            }
          />

          <div className={styles.scoreBlock}>
            <div>
              <span className={styles.sectionLabel}>Plan score</span>
              <div
                className={styles.scoreValue}
                aria-label={`Plan score ${scorePreview.score} out of 100`}
              >
                <span key={scorePreview.score} className={styles.scoreNumber}>
                  {scorePreview.score}
                </span>
                <span className={styles.scoreMax}>/100</span>
              </div>
            </div>
            <StatusPill tone={tone.tone}>{tone.label}</StatusPill>
          </div>

          <div className={styles.coverage}>
            <span className={styles.sectionLabel}>Resource coverage</span>
            {config.needs.map((need) => (
              <GaugeBar
                key={need.key}
                compact
                label={need.label}
                value={toReservePercent(draft.resources[need.key], need.max)}
                max={100}
                min={toReservePercent(need.min, need.max)}
                ideal={toReservePercent(need.ideal, need.max)}
              />
            ))}
          </div>

          <div id="moon-ready">
            <ReadyBar
              players={connected}
              readyPlayerIds={draft.readyPlayerIds}
              meId={me.id}
            />
            <MarkerSlot markers={markers} anchor="moon-ready" />
          </div>

          <div className={styles.launchBox}>
            <span className={styles.sectionLabel}>Launch check</span>
            {blockers.length > 0 ? (
              <ul className={styles.blockerList}>
                {blockers.map((blocker) => (
                  <li key={blocker}>
                    <span className={styles.blockerIcon} aria-hidden="true">
                      ▲
                    </span>
                    {blocker}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.checksPass}>
                <span aria-hidden="true">✓ </span>
                Loadout, coverage and crew checks pass.
              </p>
            )}
          </div>

          <div id="moon-launch" className={styles.actionBar}>
            <MarkerSlot markers={markers} anchor="moon-launch" />
            <div className={styles.actions}>
              {launchVisible ? (
                <HudButton
                  variant="primary"
                  onClick={() => {
                    void handleLaunch();
                  }}
                  disabled={!canLaunch || busy}
                  title={
                    canLaunch
                      ? 'Launch the Moon mission'
                      : 'Fix the launch check items first'
                  }
                >
                  {launching ? 'Launching…' : 'Launch mission'}
                </HudButton>
              ) : null}
              <HudButton
                variant={launchVisible ? 'ghost' : 'primary'}
                onClick={() => {
                  void handleToggleReady();
                }}
                disabled={busy || launching}
                aria-pressed={iAmReady}
              >
                {iAmReady ? 'Unlock plan' : 'Lock plan'}
              </HudButton>
            </div>

            {launchVisible ? null : (
              <p className={styles.hostNote}>
                {me.isHost
                  ? 'Launch unlocks when every crew member has locked in.'
                  : 'The host launches once every crew member has locked in.'}
              </p>
            )}
          </div>
        </HudPanel>
      </div>
    </HudShell>
  );
}
