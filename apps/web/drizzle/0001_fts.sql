-- Full-text search (SQLite FTS5, supported by D1).
-- Standalone FTS tables keyed by our text ids (external-content FTS assumes an
-- integer rowid, which our text primary keys are not), kept in sync by triggers.

CREATE VIRTUAL TABLE `works_fts` USING fts5(
  work_id UNINDEXED,
  title,
  synopsis,
  tokenize = 'porter unicode61'
);
--> statement-breakpoint
INSERT INTO `works_fts`(work_id, title, synopsis)
  SELECT id, title, coalesce(synopsis, '') FROM `works`;
--> statement-breakpoint
CREATE TRIGGER `works_fts_ai` AFTER INSERT ON `works` BEGIN
  INSERT INTO `works_fts`(work_id, title, synopsis)
    VALUES (new.id, new.title, coalesce(new.synopsis, ''));
END;
--> statement-breakpoint
CREATE TRIGGER `works_fts_ad` AFTER DELETE ON `works` BEGIN
  DELETE FROM `works_fts` WHERE work_id = old.id;
END;
--> statement-breakpoint
CREATE TRIGGER `works_fts_au` AFTER UPDATE ON `works` BEGIN
  DELETE FROM `works_fts` WHERE work_id = old.id;
  INSERT INTO `works_fts`(work_id, title, synopsis)
    VALUES (new.id, new.title, coalesce(new.synopsis, ''));
END;
--> statement-breakpoint
CREATE VIRTUAL TABLE `fics_fts` USING fts5(
  fic_id UNINDEXED,
  title,
  summary,
  tokenize = 'porter unicode61'
);
--> statement-breakpoint
CREATE TRIGGER `fics_fts_ai` AFTER INSERT ON `fics` BEGIN
  INSERT INTO `fics_fts`(fic_id, title, summary)
    VALUES (new.id, new.title, coalesce(new.summary, ''));
END;
--> statement-breakpoint
CREATE TRIGGER `fics_fts_ad` AFTER DELETE ON `fics` BEGIN
  DELETE FROM `fics_fts` WHERE fic_id = old.id;
END;
--> statement-breakpoint
CREATE TRIGGER `fics_fts_au` AFTER UPDATE ON `fics` BEGIN
  DELETE FROM `fics_fts` WHERE fic_id = old.id;
  INSERT INTO `fics_fts`(fic_id, title, summary)
    VALUES (new.id, new.title, coalesce(new.summary, ''));
END;
