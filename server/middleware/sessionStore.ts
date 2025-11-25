import { EventEmitter } from "events";
import type SessionStore from "express-session";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { pgTable, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import postgres from "postgres";

const sessionTable = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export class PostgresSessionStore extends EventEmitter implements SessionStore {
  private db: ReturnType<typeof drizzle>;

  constructor(connectionString: string) {
    super();
    const pgClient = postgres(connectionString, {
      ssl: "require",
    });
    this.db = drizzle(pgClient);
  }

  all(callback: (err: Error | null, obj?: Record<string, any> | null) => void): void {
    this.db
      .select()
      .from(sessionTable)
      .then((sessions) => {
        const obj: Record<string, any> = {};
        sessions.forEach((session: any) => {
          obj[session.sid] = session.sess;
        });
        callback(null, obj);
      })
      .catch(callback);
  }

  get(sid: string, callback: (err: Error | null, session?: Record<string, any> | null) => void): void {
    this.db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.sid, sid))
      .then((result) => {
        if (!result[0]) {
          callback(null, null);
        } else {
          const session = result[0] as any;
          callback(null, session.sess);
        }
      })
      .catch(callback);
  }

  set(
    sid: string,
    session: Record<string, any>,
    callback?: ((err?: Error | null) => void) | undefined
  ): void {
    const expire = new Date(session.cookie.expires || Date.now() + 24 * 60 * 60 * 1000);

    this.db
      .insert(sessionTable)
      .values({
        sid,
        sess: session,
        expire,
      })
      .onConflictDoUpdate({
        target: sessionTable.sid,
        set: {
          sess: session,
          expire,
        },
      })
      .then(() => {
        callback?.(null);
      })
      .catch((err) => {
        callback?.(err);
      });
  }

  destroy(sid: string, callback?: ((err?: Error | null) => void) | undefined): void {
    this.db
      .delete(sessionTable)
      .where(eq(sessionTable.sid, sid))
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

    this.db
      .update(sessionTable)
      .set({ expire })
      .where(eq(sessionTable.sid, sid))
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

      const newSid = require("crypto").randomBytes(16).toString("hex");
      
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
