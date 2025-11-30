import { EventEmitter } from "events";
import { randomBytes } from "crypto";
import type SessionStore from "express-session";
import postgres from "postgres";

export class PostgresSessionStore extends EventEmitter implements SessionStore {
  private sql: ReturnType<typeof postgres>;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    super();
    this.sql = postgres(connectionString, {
      ssl: "require",
    });
    this.ready = this.ensureTable();
  }

  private async ensureTable() {
    try {
      await this.sql.unsafe(`
        CREATE TABLE IF NOT EXISTS session (
          sid VARCHAR PRIMARY KEY,
          sess TEXT NOT NULL,
          expire TIMESTAMP NOT NULL
        );
      `);
      await this.sql.unsafe(`
        CREATE INDEX IF NOT EXISTS session_expire_idx ON session(expire);
      `);
      console.log("Session table ensured");
    } catch (error: any) {
      if (!error.message?.includes("already exists")) {
        console.error("Error ensuring session table:", error);
      }
    }
  }

  all(callback: (err: Error | null, obj?: Record<string, any> | null) => void): void {
    this.ready.then(() => {
      this.sql`SELECT sid, sess FROM session WHERE expire > NOW()`
        .then((rows) => {
          const obj: Record<string, any> = {};
          rows.forEach((row: any) => {
            try {
              obj[row.sid] = typeof row.sess === "string" ? JSON.parse(row.sess) : row.sess;
            } catch (e) {
              console.error("Error parsing session:", e);
            }
          });
          callback(null, obj);
        })
        .catch((err) => {
          console.error("Session all error:", err);
          callback(err);
        });
    }).catch((err) => {
      console.error("Session store not ready:", err);
      callback(err);
    });
  }

  get(sid: string, callback: (err: Error | null, session?: Record<string, any> | null) => void): void {
    this.ready.then(() => {
      this.sql`SELECT sess FROM session WHERE sid = ${sid} AND expire > NOW()`
        .then((rows) => {
          if (rows.length === 0) {
            callback(null, null);
          } else {
            try {
              const sess = rows[0].sess;
              const parsed = typeof sess === "string" ? JSON.parse(sess) : sess;
              callback(null, parsed);
            } catch (e) {
              console.error("Error parsing session:", e);
              callback(null, null);
            }
          }
        })
        .catch((err) => {
          console.error("Session get error:", err);
          callback(err);
        });
    }).catch((err) => {
      console.error("Session store not ready:", err);
      callback(err);
    });
  }

  set(
    sid: string,
    session: Record<string, any>,
    callback?: ((err?: Error | null) => void) | undefined
  ): void {
    this.ready.then(() => {
      const expire = new Date(session.cookie.expires || Date.now() + 24 * 60 * 60 * 1000);
      const sessStr = JSON.stringify(session);

      this.sql`
        INSERT INTO session (sid, sess, expire) 
        VALUES (${sid}, ${sessStr}, ${expire})
        ON CONFLICT (sid) DO UPDATE 
        SET sess = EXCLUDED.sess, expire = EXCLUDED.expire
      `
        .then(() => {
          console.log(`Session saved: ${sid}`);
          callback?.(null);
        })
        .catch((err) => {
          console.error("Session set error:", err);
          callback?.(err);
        });
    }).catch((err) => {
      console.error("Session store not ready:", err);
      callback?.(err);
    });
  }

  destroy(sid: string, callback?: ((err?: Error | null) => void) | undefined): void {
    this.ready.then(() => {
      this.sql`DELETE FROM session WHERE sid = ${sid}`
        .then(() => {
          callback?.(null);
        })
        .catch((err) => {
          console.error("Session destroy error:", err);
          callback?.(err);
        });
    }).catch((err) => {
      console.error("Session store not ready:", err);
      callback?.(err);
    });
  }

  touch(
    sid: string,
    session: Record<string, any>,
    callback?: ((err?: Error | null) => void) | undefined
  ): void {
    this.ready.then(() => {
      const expire = new Date(session.cookie.expires || Date.now() + 24 * 60 * 60 * 1000);

      this.sql`UPDATE session SET expire = ${expire} WHERE sid = ${sid}`
        .then(() => {
          callback?.(null);
        })
        .catch((err) => {
          console.error("Session touch error:", err);
          callback?.(err);
        });
    }).catch((err) => {
      console.error("Session store not ready:", err);
      callback?.(err);
    });
  }

  regenerate(
    req: any,
    callback?: ((err?: Error | null) => void) | undefined
  ): void {
    const oldSid = req.sessionID;

    this.get(oldSid, (err, session) => {
      if (err) {
        return callback?.(err);
      }

      if (session) {
        this.destroy(oldSid, (err) => {
          if (err) {
            return callback?.(err);
          }
          console.log(`Session regenerated: ${oldSid}`);
          callback?.(null);
        });
      } else {
        console.log(`Session regenerated (new): ${oldSid}`);
        callback?.(null);
      }
    });
  }
}
