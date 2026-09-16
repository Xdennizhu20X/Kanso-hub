import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export const deriveKey = (password: string, salt: Buffer): Buffer => {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
};

export const encrypt = (text: string, masterPassword: string): { encrypted: string; iv: string } => {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterPassword, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  const combined = salt.toString('hex') + tag.toString('hex') + encrypted;
  return {
    encrypted: combined,
    iv: iv.toString('hex'),
  };
};

export const decrypt = (encryptedData: string, ivHex: string, masterPassword: string): string => {
  const salt = Buffer.from(encryptedData.slice(0, SALT_LENGTH * 2), 'hex');
  const tag = Buffer.from(encryptedData.slice(SALT_LENGTH * 2, SALT_LENGTH * 2 + TAG_LENGTH * 2), 'hex');
  const encrypted = encryptedData.slice(SALT_LENGTH * 2 + TAG_LENGTH * 2);

  const key = deriveKey(masterPassword, salt);
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};
