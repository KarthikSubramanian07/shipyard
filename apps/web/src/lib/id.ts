import { customAlphabet } from "nanoid";

// URL-safe, unambiguous alphabet (no look-alike chars). 14 chars ≈ 10^25 space.
const alphabet = "0123456789abcdefghijkmnpqrstvwxyz";
const generate = customAlphabet(alphabet, 14);

export function newId(): string {
  return generate();
}
