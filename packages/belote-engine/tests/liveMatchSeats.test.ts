import {
  describe,
  expect,
  it,
} from "vitest";

import {
  areAllLiveMatchSeatsOccupied,
  claimLiveMatchSeat,
  createEmptyLiveMatchSeats,
  getLiveMatchSeatForParticipant,
  getLiveMatchSeatParticipant,
  isLiveMatchSeatOccupied,
  releaseLiveMatchSeat,
} from "../src/index.js";

describe("live match seats", () => {
  it("creates four empty seats", () => {
    const seats =
      createEmptyLiveMatchSeats();

    expect(
      seats.assignments,
    ).toEqual({
      PLAYER_0: null,
      PLAYER_1: null,
      PLAYER_2: null,
      PLAYER_3: null,
    });

    expect(
      Object.isFrozen(seats),
    ).toBe(true);

    expect(
      Object.isFrozen(
        seats.assignments,
      ),
    ).toBe(true);
  });

  it("claims an empty seat", () => {
    const initial =
      createEmptyLiveMatchSeats();

    const seats =
      claimLiveMatchSeat({
        seats: initial,
        player: "PLAYER_0",
        participantId:
          "participant-a",
      });

    expect(
      getLiveMatchSeatParticipant(
        seats,
        "PLAYER_0",
      ),
    ).toBe(
      "participant-a",
    );

    expect(
      isLiveMatchSeatOccupied(
        seats,
        "PLAYER_0",
      ),
    ).toBe(true);

    expect(
      initial.assignments.PLAYER_0,
    ).toBe(null);
  });

  it("finds the seat occupied by a participant", () => {
    const seats =
      claimLiveMatchSeat({
        seats:
          createEmptyLiveMatchSeats(),
        player: "PLAYER_2",
        participantId:
          "participant-b",
      });

    expect(
      getLiveMatchSeatForParticipant(
        seats,
        "participant-b",
      ),
    ).toBe(
      "PLAYER_2",
    );

    expect(
      getLiveMatchSeatForParticipant(
        seats,
        "participant-c",
      ),
    ).toBe(null);
  });

  it("returns the same state when the same participant claims the same seat again", () => {
    const seats =
      claimLiveMatchSeat({
        seats:
          createEmptyLiveMatchSeats(),
        player: "PLAYER_1",
        participantId:
          "participant-a",
      });

    const repeated =
      claimLiveMatchSeat({
        seats,
        player: "PLAYER_1",
        participantId:
          "participant-a",
      });

    expect(
      repeated,
    ).toBe(seats);
  });

  it("rejects a participant claiming two different seats", () => {
    const seats =
      claimLiveMatchSeat({
        seats:
          createEmptyLiveMatchSeats(),
        player: "PLAYER_0",
        participantId:
          "participant-a",
      });

    expect(() =>
      claimLiveMatchSeat({
        seats,
        player: "PLAYER_1",
        participantId:
          "participant-a",
      }),
    ).toThrow(
      "Participant participant-a already occupies PLAYER_0",
    );
  });

  it("rejects claiming an already occupied seat", () => {
    const seats =
      claimLiveMatchSeat({
        seats:
          createEmptyLiveMatchSeats(),
        player: "PLAYER_3",
        participantId:
          "participant-a",
      });

    expect(() =>
      claimLiveMatchSeat({
        seats,
        player: "PLAYER_3",
        participantId:
          "participant-b",
      }),
    ).toThrow(
      "Match seat PLAYER_3 is already occupied",
    );
  });

  it("releases a seat occupied by the participant", () => {
    const occupied =
      claimLiveMatchSeat({
        seats:
          createEmptyLiveMatchSeats(),
        player: "PLAYER_2",
        participantId:
          "participant-a",
      });

    const released =
      releaseLiveMatchSeat({
        seats: occupied,
        player: "PLAYER_2",
        participantId:
          "participant-a",
      });

    expect(
      released.assignments.PLAYER_2,
    ).toBe(null);

    expect(
      occupied.assignments.PLAYER_2,
    ).toBe(
      "participant-a",
    );
  });

  it("rejects releasing another participant's seat", () => {
    const seats =
      claimLiveMatchSeat({
        seats:
          createEmptyLiveMatchSeats(),
        player: "PLAYER_0",
        participantId:
          "participant-a",
      });

    expect(() =>
      releaseLiveMatchSeat({
        seats,
        player: "PLAYER_0",
        participantId:
          "participant-b",
      }),
    ).toThrow(
      "Participant participant-b does not occupy PLAYER_0",
    );
  });

  it("rejects releasing an empty seat", () => {
    const seats =
      createEmptyLiveMatchSeats();

    expect(() =>
      releaseLiveMatchSeat({
        seats,
        player: "PLAYER_1",
        participantId:
          "participant-a",
      }),
    ).toThrow(
      "Match seat PLAYER_1 is not occupied",
    );
  });

  it("rejects empty participant IDs", () => {
    const seats =
      createEmptyLiveMatchSeats();

    expect(() =>
      claimLiveMatchSeat({
        seats,
        player: "PLAYER_0",
        participantId: "   ",
      }),
    ).toThrow(
      "Participant ID must not be empty",
    );

    expect(() =>
      getLiveMatchSeatForParticipant(
        seats,
        "",
      ),
    ).toThrow(
      "Participant ID must not be empty",
    );
  });

  it("detects when all four seats are occupied", () => {
    let seats =
      createEmptyLiveMatchSeats();

    seats =
      claimLiveMatchSeat({
        seats,
        player: "PLAYER_0",
        participantId: "a",
      });

    seats =
      claimLiveMatchSeat({
        seats,
        player: "PLAYER_1",
        participantId: "b",
      });

    seats =
      claimLiveMatchSeat({
        seats,
        player: "PLAYER_2",
        participantId: "c",
      });

    expect(
      areAllLiveMatchSeatsOccupied(
        seats,
      ),
    ).toBe(false);

    seats =
      claimLiveMatchSeat({
        seats,
        player: "PLAYER_3",
        participantId: "d",
      });

    expect(
      areAllLiveMatchSeatsOccupied(
        seats,
      ),
    ).toBe(true);
  });
});