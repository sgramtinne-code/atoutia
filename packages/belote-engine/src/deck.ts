import type { Card } from "./cards.js";
import type { RandomSource } from "./random.js";

export function shuffleDeck(
  deck: readonly Card[],
  random: RandomSource,
): readonly Card[] {
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random.next() * (index + 1));

    const currentCard = shuffled[index];
    const randomCard = shuffled[randomIndex];

    if (currentCard === undefined || randomCard === undefined) {
      throw new Error("Invalid deck state during shuffle.");
    }

    shuffled[index] = randomCard;
    shuffled[randomIndex] = currentCard;
  }

  return Object.freeze(shuffled);
}