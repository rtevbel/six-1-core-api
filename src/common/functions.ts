import * as bcrypt from 'bcrypt';

/**
 *  Hash Content
 * @param content:string
 * @returns string
 */
export async function hash_content(content: string): Promise<string> {
  const slatOrRound = 10;
  const salt = await bcrypt.genSalt();
  return await bcrypt.hash(content, salt);
}

/**
 * Compare Hashed Content
 * @param content
 * @param hashedString
 * @returns
 */
export async function compare_hashed_content(
  content: string,
  hashedString: string,
): Promise<boolean> {
  return bcrypt.compare(content, hashedString);
}
