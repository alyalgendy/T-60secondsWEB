import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { missionConfig } from './config';
import { formatUnits, scorePlan } from '../../shared/scoring';
import type { MissionPlan, PlanningSceneProps, ResourceKey } from '../../shared/types';
import {
  FactCard,
  GaugeBar,
  HudButton,
  HudPanel,
  HudShell,
  PlayerBadge,
  ReadyBar,
  ResourceSlider,
  StatusPill,
} from '../../shared/ui';
import styles from './IssScene.module.css';

/** Mission 1: plan a crew rotation on the International Space Station. */
export default function IssScene({
  roomCode,
  me,
  players,
  draft,
  updateDraft,
  toggleReady,
  launch,
  missionId,
}: PlanningSceneProps) {
  const needs = missionConfig.needs;
  const craft = missionConfig.crafts.find((option) => option.id === draft.craftId) ?? null;
  const onlyCraft = missionConfig.crafts.length === 1 ? missionConfig.crafts[0] : null;
  const analysis = scorePlan(missionConfig, draft);

  // Safety net for a fresh room: if the mission has one craft, select it once.
  const autoSelected = useRef(false);
  useEffect(() => {
    if (onlyCraft && draft.craftId !== onlyCraft.id && !autoSelected.current) {
      autoSelected.current = true;
      void updateDraft({ craftId: onlyCraft.id });
    }
  }, [onlyCraft, draft.craftId, updateDraft]);

  const readyLookup = new Set(draft.readyPlayerIds);
  const readyCount = players.filter((player) => readyLookup.has(player.id)).length;
  const allReady = readyCount === players.length;
  const iAmReady = readyLookup.has(me.id);
  const host = players.find((player) => player.isHost) ?? null;

  const editor = draft.lastEditedBy
    ? players.find((player) => player.id === draft.lastEditedBy) ?? null
    : null;
  const editedByOther = editor && editor.id !== me.id ? editor : null;

  const overBudget = analysis.massUsed > analysis.massBudget;
  const underMinimum = needs.filter((need) => valueOf(draft.resources, need.key) < need.min);

  const blockers: string[] = [];
  if (missionConfig.crafts.length > 0 && !craft) {
    blockers.push('Choose a craft before launch.');
  }
  if (overBudget) {
    blockers.push(
      `Mass is ${formatUnits(analysis.massUsed - analysis.massBudget)} units over the ${formatUnits(
        analysis.massBudget,
      )}-unit budget.`,
    );
  }
  for (const need of underMinimum) {
    const missing = need.min - valueOf(draft.resources, need.key);
    blockers.push(
      `${need.label} is ${formatUnits(missing)} below the ${formatUnits(need.min)}-unit minimum.`,
    );
  }
  const notReady = players.filter((player) => !readyLookup.has(player.id));
  if (notReady.length > 0) {
    blockers.push(
      notReady.length === 1
        ? `${notReady[0]?.name ?? 'One player'} has not locked yet.`
        : `${notReady.map((player) => player.name).join(', ')} have not locked yet.`,
    );
  }
  const canLaunch = blockers.length === 0;

  const setResource = (key: ResourceKey, value: number) => {
    void updateDraft({ resources: { ...draft.resources, [key]: value } });
  };

  const handleLaunch = () => {
    if (!me.isHost || !canLaunch) return;
    const plan: MissionPlan = {
      missionId,
      craftId: draft.craftId,
      resources: draft.resources,
      massUsed: analysis.massUsed,
      massBudget: analysis.massBudget,
      score: analysis.score,
      lockedAt: Date.now(),
    };
    void launch(plan);
  };

  const scoreTone: 'ok' | 'warn' | 'danger' =
    analysis.score >= 80 ? 'ok' : analysis.score >= 60 ? 'warn' : 'danger';
  const scoreLabel =
    analysis.score >= 80 ? 'Strong plan' : analysis.score >= 60 ? 'Workable' : 'Risky';

  return (
    <HudShell
      missionName={missionConfig.title}
      stepLabel="Mission planning"
      roomCode={roomCode}
      players={players}
      me={me}
      headerAside={<StatusPill tone="info">Draft live</StatusPill>}
    >
      <div className={styles.grid}>
        {/* Left: mission brief */}
        <HudPanel
          title="Mission Brief"
          subtitle={missionConfig.destination}
          className={styles.columnPanel}
          scroll
        >
          <p className={styles.lead}>
            The International Space Station is a research laboratory in low Earth orbit, built and
            operated by five space agencies.
          </p>

          <div className={styles.goalBox}>
            <span className={styles.sectionLabel}>Mission goal</span>
            <p className={styles.goal}>{missionConfig.goal}</p>
          </div>

          <div className={styles.facts}>
            {missionConfig.facts.map((fact, index) => (
              <FactCard key={`${fact.source.url}-${index}`} fact={fact} index={index} />
            ))}
          </div>

          <p className={styles.duration}>
            <span className={styles.sectionLabel}>Planned stay</span>
            <span className={styles.durationValue}>{missionConfig.durationDays} days</span>
          </p>
        </HudPanel>

        {/* Center: plan builder */}
        <HudPanel
          title="Plan Builder"
          subtitle={
            craft
              ? `${craft.name} · ${craft.crewCapacity} crew · ${formatUnits(analysis.massBudget)} units of capacity`
              : 'Pick a craft to see its mass capacity'
          }
          className={styles.columnPanel}
          scroll
          actions={
            editedByOther ? (
              <span className={styles.editedBy}>
                <PlayerBadge player={editedByOther} size="sm" showName={false} />
                <span className={styles.editedText}>last edit</span>
              </span>
            ) : null
          }
        >
          {missionConfig.crafts.length > 1 ? (
            <div className={styles.craftSection}>
              <span className={styles.sectionLabel}>Craft</span>
              <div className={styles.chooser} role="radiogroup" aria-label="Choose a craft">
                {missionConfig.crafts.map((option) => {
                  const selected = option.id === draft.craftId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={clsx(styles.craftOption, selected && styles.craftOptionActive)}
                      onClick={() => void updateDraft({ craftId: option.id })}
                    >
                      <span className={styles.craftOptionName}>{option.name}</span>
                      <span className={styles.craftMeta}>
                        {option.crewCapacity} crew · {option.massCapacity} units
                      </span>
                      <span className={styles.craftDesc}>{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : craft ? (
            <div className={styles.craftBox}>
              <div className={styles.craftTop}>
                <span className={styles.sectionLabel}>Craft</span>
                <StatusPill tone="info">Auto-selected</StatusPill>
              </div>
              <div className={styles.craftName}>{craft.name}</div>
              <p className={styles.craftDesc}>{craft.description}</p>
              <p className={styles.craftMeta}>
                {craft.crewCapacity} crew · {craft.massCapacity} units of capacity
              </p>
            </div>
          ) : (
            <p className={styles.footnote}>No craft selected yet.</p>
          )}

          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Supplies</span>
            <span className={styles.noteTight}>Game units, not kilograms</span>
          </div>

          <div className={styles.sliders}>
            {needs.map((need) => (
              <ResourceSlider
                key={need.key}
                need={need}
                value={valueOf(draft.resources, need.key)}
                disabled={iAmReady}
                onChange={(value) => setResource(need.key, value)}
              />
            ))}
          </div>

          {iAmReady ? (
            <p className={styles.footnote}>
              Your plan is locked. Press Unlock plan to edit the supplies again.
            </p>
          ) : null}

          <p className={styles.footnote}>
            Minimums keep the crew alive. Ideals leave a safe margin. Every unit adds mass, so the
            crew cannot max everything.
          </p>
        </HudPanel>

        {/* Right: mission status + launch */}
        <div className={styles.rightCol}>
          <HudPanel title="Mission Status" className={styles.statusPanel} scroll>
            <div className={styles.statusBody}>
              <div className={styles.missionMeta}>
                <span>
                  <span className={styles.sectionLabel}>Crew</span>{' '}
                  <span className={styles.metaValue}>{players.length}</span>
                </span>
                <span>
                  <span className={styles.sectionLabel}>Stay</span>{' '}
                  <span className={styles.metaValue}>{missionConfig.durationDays} days</span>
                </span>
              </div>

              <GaugeBar
                label="Mass used"
                value={analysis.massUsed}
                max={analysis.massBudget}
                limit="atMost"
                unit="units"
                hint={`Ceiling set by ${craft?.name ?? 'the mission'}.`}
              />

              <div className={styles.divider} role="presentation" />

              <span className={styles.sectionLabel}>Coverage</span>

              <div className={styles.gauges}>
                {needs.map((need) => (
                  <GaugeBar
                    key={need.key}
                    compact
                    label={need.label}
                    value={valueOf(draft.resources, need.key)}
                    max={need.max}
                    min={need.min}
                    ideal={need.ideal}
                  />
                ))}
              </div>

              <div className={styles.divider} role="presentation" />

              <div className={styles.score}>
                <div className={styles.scoreCopy}>
                  <div className={styles.scoreHead}>
                    <span className={styles.sectionLabel}>Plan score</span>
                    <StatusPill tone={scoreTone}>{scoreLabel}</StatusPill>
                  </div>
                  <p className={styles.scoreHint}>
                    Rises as each supply nears its ideal. Oversupply still costs mass.
                  </p>
                </div>
                <p className={styles.scoreValue} aria-hidden="true">
                  {analysis.score}
                  <span className={styles.scoreMax}>/100</span>
                </p>
                <span className={styles.srOnly}>Plan score {analysis.score} of 100.</span>
              </div>
            </div>
          </HudPanel>

          <HudPanel title="Launch" className={styles.launchPanel} bodyClassName={styles.launchBody}>
            <ReadyBar players={players} readyPlayerIds={draft.readyPlayerIds} meId={me.id} />

            <div className={styles.blockers} role="status" aria-live="polite">
              {canLaunch ? (
                <p className={styles.readyNote}>
                  <span aria-hidden="true">✓</span>{' '}
                  {me.isHost
                    ? 'All checks pass. Ready to launch.'
                    : `All checks pass. ${host?.name ?? 'The host'} can launch.`}
                </p>
              ) : (
                <>
                  <span className={styles.blockedTitle}>Launch blocked</span>
                  <ul className={styles.blockerList}>
                    {blockers.map((blocker) => (
                      <li key={blocker} className={styles.blocker}>
                        <span className={styles.blockerMark} aria-hidden="true">
                          ×
                        </span>
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className={styles.actions}>
              <HudButton
                variant={me.isHost && allReady ? 'ghost' : 'primary'}
                aria-pressed={iAmReady}
                onClick={() => void toggleReady()}
              >
                {iAmReady ? 'Unlock plan' : 'Lock plan'}
              </HudButton>
              {me.isHost && allReady ? (
                <HudButton variant="primary" onClick={handleLaunch} disabled={!canLaunch}>
                  Launch mission
                </HudButton>
              ) : null}
            </div>

            {!me.isHost ? (
              <p className={styles.note}>
                The host launches once every crew member has locked a plan.
              </p>
            ) : null}
          </HudPanel>
        </div>
      </div>
    </HudShell>
  );
}

function valueOf(resources: Record<ResourceKey, number>, key: ResourceKey): number {
  return resources[key] ?? 0;
}
