import {
  randomInt,
} from "node:crypto";

import {
  PLAYER_POSITIONS,
  applyLiveMatchRoomNetworkCommand,
  claimRevisionedLiveMatchRoomSeat,
  createLiveMatchRoomSnapshotDocument,
  createRevisionedLiveMatchRoom,
  getLiveMatchSeatParticipant,
  releaseRevisionedLiveMatchRoomSeat,
  startRevisionedLiveMatchRoom,
  type LiveMatchRoomCommandDocument,
  type LiveMatchRoomSnapshotDocument,
  type PlayerPosition,
  type RevisionedLiveMatchRoom,
} from "@atoutia/belote-engine";

import {
  createPendingAbsenceResolution,
  resolveLiveRoomAbsenceResolution,
  type LiveRoomAbsenceResolution,
  type PendingAbsenceResolutionAction,
  type ResolvedLiveRoomAbsenceResolutionStatus,
} from "./liveRoomAbsenceResolution.js";

import {
  createLiveRoomSeatControl,
  transferLiveRoomSeatControlToBot,
  type LiveRoomSeatControl,
} from "./liveRoomSeatControl.js";

import type {
  MatchMode,
} from "./matchMode.js";

export interface LiveRoomSeatSummary {
  readonly PLAYER_0:
    boolean;

  readonly PLAYER_1:
    boolean;

  readonly PLAYER_2:
    boolean;

  readonly PLAYER_3:
    boolean;
}

export interface LiveRoomSummary {
  readonly sessionId:
    string;

  readonly mode:
    MatchMode;

  readonly revision:
    number;

  readonly phase:
    RevisionedLiveMatchRoom[
      "managedRoom"
    ][
      "phase"
    ];

  readonly occupiedSeats:
    number;

  readonly seats:
    LiveRoomSeatSummary;
}

export interface CreateLiveRoomOptions {
  readonly mode?:
    MatchMode;
}

export interface ClaimLiveRoomSeatOptions {
  readonly sessionId:
    string;

  readonly expectedRevision:
    number;

  readonly player:
    PlayerPosition;

  readonly participantId:
    string;
}

export interface ReleaseLiveRoomSeatOptions {
  readonly sessionId:
    string;

  readonly expectedRevision:
    number;

  readonly player:
    PlayerPosition;

  readonly participantId:
    string;
}

export interface StartLiveRoomOptions {
  readonly sessionId:
    string;

  readonly expectedRevision:
    number;
}

export interface CreateParticipantSnapshotOptions {
  readonly sessionId:
    string;

  readonly participantId:
    string;
}

export interface ApplyLiveRoomCommandOptions {
  readonly sessionId:
    string;

  readonly participantId:
    string;

  readonly document:
    LiveMatchRoomCommandDocument;
}

export interface ApplyLiveRoomCommandResult {
  readonly room:
    RevisionedLiveMatchRoom;

  readonly snapshot:
    LiveMatchRoomSnapshotDocument;
}

export interface MarkLiveRoomAbsenceResolutionPendingOptions {
  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;

  readonly action:
    PendingAbsenceResolutionAction;
}

export interface ResolveStoredLiveRoomAbsenceResolutionOptions {
  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;

  readonly status:
    ResolvedLiveRoomAbsenceResolutionStatus;
}

export interface ClearLiveRoomAbsenceResolutionOptions {
  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;
}

export interface TransferLiveRoomSeatControlToBotStoreOptions {
  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;
}

export type LiveRoomStoreListener =
  (
    room:
      RevisionedLiveMatchRoom,
  ) => void;

export class LiveRoomNotFoundError
  extends Error {
  public constructor(
    sessionId:
      string,
  ) {
    super(
      `Live room not found: ${sessionId}`,
    );

    this.name =
      "LiveRoomNotFoundError";
  }
}

export class LiveRoomAbsenceResolutionNotFoundError
  extends Error {
  public constructor(
    sessionId:
      string,

    player:
      PlayerPosition,
  ) {
    super(
      `Live room absence resolution not found: ${sessionId} ${player}`,
    );

    this.name =
      "LiveRoomAbsenceResolutionNotFoundError";
  }
}

export class LiveRoomStore {
  readonly #rooms =
    new Map<
      string,
      RevisionedLiveMatchRoom
    >();

  readonly #modes =
    new Map<
      string,
      MatchMode
    >();

  readonly #absenceResolutions =
    new Map<
      string,
      Map<
        PlayerPosition,
        LiveRoomAbsenceResolution
      >
    >();

  readonly #seatControls =
    new Map<
      string,
      Map<
        PlayerPosition,
        LiveRoomSeatControl
      >
    >();

  readonly #listeners =
    new Set<
      LiveRoomStoreListener
    >();

  public create(
    options:
      CreateLiveRoomOptions = {},
  ):
    RevisionedLiveMatchRoom {
    const baseSeed =
      randomInt(
        0,
        0x7fffffff,
      );

    const room =
      createRevisionedLiveMatchRoom({
        baseSeed,
      });

    const sessionId =
      room.managedRoom.room.session
        .sessionId;

    const mode =
      options.mode ??
      "CASUAL";

    this.#rooms.set(
      sessionId,
      room,
    );

    this.#modes.set(
      sessionId,
      mode,
    );

    this.#absenceResolutions.set(
      sessionId,
      new Map<
        PlayerPosition,
        LiveRoomAbsenceResolution
      >(),
    );

    const seatControls =
      new Map<
        PlayerPosition,
        LiveRoomSeatControl
      >();

    for (
      const player
      of PLAYER_POSITIONS
    ) {
      seatControls.set(
        player,
        createLiveRoomSeatControl({
          player,
        }),
      );
    }

    this.#seatControls.set(
      sessionId,
      seatControls,
    );

    return room;
  }

  public get(
    sessionId:
      string,
  ):
    | RevisionedLiveMatchRoom
    | undefined {
    return this.#rooms.get(
      sessionId,
    );
  }

  public getMode(
    sessionId:
      string,
  ):
    | MatchMode
    | undefined {
    return this.#modes.get(
      sessionId,
    );
  }

  public requireMode(
    sessionId:
      string,
  ): MatchMode {
    this.#requireRoom(
      sessionId,
    );

    const mode =
      this.#modes.get(
        sessionId,
      );

    if (
      mode ===
      undefined
    ) {
      throw new Error(
        `Live room mode not found: ${sessionId}`,
      );
    }

    return mode;
  }

  public createSummary(
    room:
      RevisionedLiveMatchRoom,
  ): LiveRoomSummary {
    const sessionId =
      room.managedRoom.room.session
        .sessionId;

    return createLiveRoomSummary(
      room,
      this.requireMode(
        sessionId,
      ),
    );
  }

  public claimSeat(
    options:
      ClaimLiveRoomSeatOptions,
  ): RevisionedLiveMatchRoom {
    const room =
      this.#requireRoom(
        options.sessionId,
      );

    const nextRoom =
      claimRevisionedLiveMatchRoomSeat({
        room,

        expectedRevision:
          options.expectedRevision,

        player:
          options.player,

        participantId:
          options.participantId,
      });

    this.#storeMutation(
      options.sessionId,
      room,
      nextRoom,
    );

    return nextRoom;
  }

  public releaseSeat(
    options:
      ReleaseLiveRoomSeatOptions,
  ): RevisionedLiveMatchRoom {
    const room =
      this.#requireRoom(
        options.sessionId,
      );

    const nextRoom =
      releaseRevisionedLiveMatchRoomSeat({
        room,

        expectedRevision:
          options.expectedRevision,

        player:
          options.player,

        participantId:
          options.participantId,
      });

    this.#storeMutation(
      options.sessionId,
      room,
      nextRoom,
    );

    return nextRoom;
  }

  public start(
    options:
      StartLiveRoomOptions,
  ): RevisionedLiveMatchRoom {
    const room =
      this.#requireRoom(
        options.sessionId,
      );

    const nextRoom =
      startRevisionedLiveMatchRoom({
        room,

        expectedRevision:
          options.expectedRevision,
      });

    this.#storeMutation(
      options.sessionId,
      room,
      nextRoom,
    );

    return nextRoom;
  }

  public createParticipantSnapshot(
    options:
      CreateParticipantSnapshotOptions,
  ): LiveMatchRoomSnapshotDocument {
    const room =
      this.#requireRoom(
        options.sessionId,
      );

    return createLiveMatchRoomSnapshotDocument(
      room,
      options.participantId,
    );
  }

  public applyCommand(
    options:
      ApplyLiveRoomCommandOptions,
  ): ApplyLiveRoomCommandResult {
    const room =
      this.#requireRoom(
        options.sessionId,
      );

    const result =
      applyLiveMatchRoomNetworkCommand({
        room,

        participantId:
          options.participantId,

        document:
          options.document,
      });

    this.#storeMutation(
      options.sessionId,
      room,
      result.room,
    );

    return Object.freeze({
      room:
        result.room,

      snapshot:
        result.snapshot,
    });
  }

  public getAbsenceResolution(
    sessionId:
      string,

    player:
      PlayerPosition,
  ):
    | LiveRoomAbsenceResolution
    | undefined {
    return this.#absenceResolutions
      .get(
        sessionId,
      )
      ?.get(
        player,
      );
  }

  public listAbsenceResolutions(
    sessionId:
      string,
  ): readonly LiveRoomAbsenceResolution[] {
    this.#requireRoom(
      sessionId,
    );

    const resolutions =
      this.#requireAbsenceResolutionMap(
        sessionId,
      );

    return Object.freeze(
      [
        ...resolutions.values(),
      ],
    );
  }

  public markAbsenceResolutionPending(
    options:
      MarkLiveRoomAbsenceResolutionPendingOptions,
  ): LiveRoomAbsenceResolution {
    this.#requireRoom(
      options.sessionId,
    );

    const resolutions =
      this.#requireAbsenceResolutionMap(
        options.sessionId,
      );

    const existing =
      resolutions.get(
        options.player,
      );

    if (
      existing !==
      undefined
    ) {
      if (
        existing.action !==
        options.action
      ) {
        throw new Error(
          `Live room absence resolution action conflict for ${options.player}: ${existing.action} !== ${options.action}.`,
        );
      }

      return existing;
    }

    const resolution =
      createPendingAbsenceResolution({
        player:
          options.player,

        action:
          options.action,
      });

    resolutions.set(
      options.player,
      resolution,
    );

    return resolution;
  }

  public resolveAbsenceResolution(
    options:
      ResolveStoredLiveRoomAbsenceResolutionOptions,
  ): LiveRoomAbsenceResolution {
    this.#requireRoom(
      options.sessionId,
    );

    const resolutions =
      this.#requireAbsenceResolutionMap(
        options.sessionId,
      );

    const existing =
      resolutions.get(
        options.player,
      );

    if (
      existing ===
      undefined
    ) {
      throw new LiveRoomAbsenceResolutionNotFoundError(
        options.sessionId,
        options.player,
      );
    }

    const resolved =
      resolveLiveRoomAbsenceResolution({
        resolution:
          existing,

        status:
          options.status,
      });

    resolutions.set(
      options.player,
      resolved,
    );

    return resolved;
  }

  public clearAbsenceResolution(
    options:
      ClearLiveRoomAbsenceResolutionOptions,
  ): boolean {
    this.#requireRoom(
      options.sessionId,
    );

    const resolutions =
      this.#requireAbsenceResolutionMap(
        options.sessionId,
      );

    const existing =
      resolutions.get(
        options.player,
      );

    if (
      existing ===
      undefined
    ) {
      return false;
    }

    if (
      existing.status !==
      "PENDING"
    ) {
      throw new Error(
        `Resolved absence resolution cannot be cleared for ${options.player}.`,
      );
    }

    resolutions.delete(
      options.player,
    );

    return true;
  }

  public getSeatControl(
    sessionId:
      string,

    player:
      PlayerPosition,
  ): LiveRoomSeatControl {
    this.#requireRoom(
      sessionId,
    );

    const controls =
      this.#requireSeatControlMap(
        sessionId,
      );

    const control =
      controls.get(
        player,
      );

    if (
      control ===
      undefined
    ) {
      throw new Error(
        `Live room seat control not found: ${sessionId} ${player}`,
      );
    }

    return control;
  }

  public listSeatControls(
    sessionId:
      string,
  ): readonly LiveRoomSeatControl[] {
    this.#requireRoom(
      sessionId,
    );

    const controls =
      this.#requireSeatControlMap(
        sessionId,
      );

    return Object.freeze(
      PLAYER_POSITIONS.map(
        (
          player,
        ) => {
          const control =
            controls.get(
              player,
            );

          if (
            control ===
            undefined
          ) {
            throw new Error(
              `Live room seat control not found: ${sessionId} ${player}`,
            );
          }

          return control;
        },
      ),
    );
  }

  public transferSeatControlToBot(
    options:
      TransferLiveRoomSeatControlToBotStoreOptions,
  ): LiveRoomSeatControl {
    const room =
      this.#requireRoom(
        options.sessionId,
      );

    const participantId =
      getLiveMatchSeatParticipant(
        room.managedRoom.room.seats,
        options.player,
      );

    if (
      participantId ===
      null
    ) {
      throw new Error(
        `Cannot transfer unoccupied live room seat ${options.player} to BOT control.`,
      );
    }

    const controls =
      this.#requireSeatControlMap(
        options.sessionId,
      );

    const existing =
      controls.get(
        options.player,
      );

    if (
      existing ===
      undefined
    ) {
      throw new Error(
        `Live room seat control not found: ${options.sessionId} ${options.player}`,
      );
    }

    const nextControl =
      transferLiveRoomSeatControlToBot({
        control:
          existing,
      });

    controls.set(
      options.player,
      nextControl,
    );

    return nextControl;
  }

  public subscribe(
    listener:
      LiveRoomStoreListener,
  ): () => void {
    this.#listeners.add(
      listener,
    );

    return () => {
      this.#listeners.delete(
        listener,
      );
    };
  }

  public count():
    number {
    return this.#rooms.size;
  }

  #storeMutation(
    sessionId:
      string,

    previousRoom:
      RevisionedLiveMatchRoom,

    nextRoom:
      RevisionedLiveMatchRoom,
  ): void {
    this.#rooms.set(
      sessionId,
      nextRoom,
    );

    if (
      nextRoom ===
      previousRoom
    ) {
      return;
    }

    for (
      const listener
      of this.#listeners
    ) {
      listener(
        nextRoom,
      );
    }
  }

  #requireAbsenceResolutionMap(
    sessionId:
      string,
  ): Map<
    PlayerPosition,
    LiveRoomAbsenceResolution
  > {
    const resolutions =
      this.#absenceResolutions.get(
        sessionId,
      );

    if (
      resolutions ===
      undefined
    ) {
      throw new Error(
        `Live room absence resolution state not found: ${sessionId}`,
      );
    }

    return resolutions;
  }

  #requireSeatControlMap(
    sessionId:
      string,
  ): Map<
    PlayerPosition,
    LiveRoomSeatControl
  > {
    const controls =
      this.#seatControls.get(
        sessionId,
      );

    if (
      controls ===
      undefined
    ) {
      throw new Error(
        `Live room seat control state not found: ${sessionId}`,
      );
    }

    return controls;
  }

  #requireRoom(
    sessionId:
      string,
  ): RevisionedLiveMatchRoom {
    const room =
      this.#rooms.get(
        sessionId,
      );

    if (
      room ===
      undefined
    ) {
      throw new LiveRoomNotFoundError(
        sessionId,
      );
    }

    return room;
  }
}

export function createLiveRoomSummary(
  room:
    RevisionedLiveMatchRoom,

  mode:
    MatchMode =
      "CASUAL",
): LiveRoomSummary {
  const assignments =
    room.managedRoom.room.seats
      .assignments;

  const occupiedSeats =
    Object.values(
      assignments,
    ).filter(
      (
        participantId,
      ) =>
        participantId !==
        null,
    ).length;

  return Object.freeze({
    sessionId:
      room.managedRoom.room.session
        .sessionId,

    mode,

    revision:
      room.revision,

    phase:
      room.managedRoom.phase,

    occupiedSeats,

    seats:
      Object.freeze({
        PLAYER_0:
          assignments.PLAYER_0 !==
          null,

        PLAYER_1:
          assignments.PLAYER_1 !==
          null,

        PLAYER_2:
          assignments.PLAYER_2 !==
          null,

        PLAYER_3:
          assignments.PLAYER_3 !==
          null,
      }),
  });
}