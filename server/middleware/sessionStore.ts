import { EventEmitter } from "events";
import { randomBytes } from "crypto";
import type SessionStore from "express-session";
import postgres from "postgres";

export class PostgresSessionStore extends EventEmitter implements SessionStore {
  private sql: ReturnType<typeof postgres>;

  constructor(connectionString: string) {
    super();
    this.sql = postgres(connectionString, {
      ssl: "require",
    });
    this.ensureTable();
  }

  private async ensureTable() {
    try {
      await this.sql.unsafe(`
        CREATE TABLE IF NOT EXISTS session (
          sid VARCHAR PRIMARY KEY,
          sess JSONB NOT NULL,
          expire TIMESTAMP NOT NULL
        );
      `);
      await this.sql.unsafe(`
        CREATE INDEX IF NOT EXISTS session_expire_idx ON session(expire);
      `);
    } catch (error) {
      console.error("Error ensuring session table:", error);
    }
  }

  all(callback: (err: Error | null, obj?: Record<string, any> | null) => void): void {
    this.sql`SELECT sid, sess FROM session WHERE expire > NOW()`
      .then((rows) => {
        const obj: Record<string, any> = {};
        rows.forEach((row: any) => {
          obj[row.sid] = row.sess;
        });
        callback(null, obj);
      })
      .catch(callback);
  }

  get(sid: string, callback: (err: Error | null, session?: Record<string, any> | null) => void): void {
    this.sql`SELECT sess FROM session WHERE sid = ${sid} AND expire > NOW()`
      .then((rows) => {
        if (rows.length === 0) {
          callback(null, null);
        } else {
          const sess = rows[0].sess;
          callback(null, typeof sess === "string" ? JSON.parse(sess) : sess);
        }
      })
      .catch((err) => {
        console.error("Session get error:", err);
        callback(err);
      });
  }

  set(
    sid: string,
    session: Record<string, any>,
    callback?: ((err?: Error | null) => void) | undefined
  ): void {
    const expire = new Date(session.cookie.expires || Date.now() + 24 * 60 * 60 * 1000);
    const sessJson = session;

    this.sql`
      INSERT INTO session (sid, sess, expire) 
      VALUES (${sid}, ${sessJson}::jsonb, ${expire})
      ON CONFLICT (sid) DO UPDATE 
      SET sess = EXCLUDED.sess, expire = EXCLUDED.expire
    `
      .then(() => {
        callback?.(null);
      })
      .catch((err) => {
        console.error("Session set error:", err);
        callback?.(err);
      });
  }

  destroy(sid: string, callback?: ((err?: Error | null) => void) | undefined): void {
    this.sql`DELETE FROM session WHERE sid = ${sid}`
      .then(() => {
        callback?.(null);
      })
      .catch((err) => {
        callback?.(err);
      });
  }

  touch(
    sid: string,
    session: Record<string, any>,
    callback?: ((err?: Error | null) => void) | undefined
  ): void {
    const expire = new Date(session.cookie.expires || Date.now() + 24 * 60 * 60 * 1000);

    this.sql`UPDATE session SET expire = ${expire} WHERE sid = ${sid}`
      .then(() => {
        callback?.(null);
      })
      .catch((err) => {
        callback?.(err);
      });
  }

  regenerate(
    req: any,
    callback?: ((err?: Error | null) => void) | undefined
  ): void {
    const oldSid = req.sessionID;
    delete req.sessionID;

    this.get(oldSid, (err, session) => {
      if (err) {
        return callback?.(err);
      }

      const newSid = randomBytes(16).toString("hex");

      if (session) {
        this.set(newSid, session, (err) => {
          if (err) {
            return callback?.(err);
          }
          this.destroy(oldSid, (err) => {
            callback?.(err);
          });
        });
      } else {
        callback?.(null);
      }
    });
  }
}
