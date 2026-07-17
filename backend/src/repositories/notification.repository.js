const client = require('../config/db');

const TABLE = 'notifications';
const Rec_TABLE = 'notification_recipients';

async function createNotification({ id, user_id, branch_id, title, message, notification_type, priority, is_read = false, created_by, expires_at, recipients = []
}) {

    try {
        await client.query("BEGIN");

        const q = `
            INSERT INTO notifications
            ( notification_id, user_id, branch_id, title, message, notification_type, created_by, is_read, priority, expires_at
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *;
        `;

        const values = [ id, user_id, branch_id, title, message, notification_type, created_by, is_read, priority, expires_at
        ];

        const { rows } = await client.query(q, values);

        for (const recipient of recipients) {

            await client.query(
                ` INSERT INTO notification_recipients
                ( notification_id, user_id, is_read) VALUES ($1,$2,$3) `,
                [ rows[0].notification_id, recipient, false ]
            );
        }

        await client.query("COMMIT");

        return rows[0];

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;
    }
}

async function getNotificationById(notificationId, userId = null) {
    const q = `
        SELECT
            n.*,
            nr.user_id,
            nr.is_read,
            nr.read_at
        FROM notifications n
        INNER JOIN notification_recipients nr
            ON n.notification_id = nr.notification_id
        WHERE n.notification_id = $1
          OR nr.user_id = $2
          AND n.deleted_at IS NULL
        LIMIT 1
    `;

    const { rows } = await client.query(q, [notificationId, userId]);

    return rows[0] || null;
}

async function listNotifications({
    userId,
    isRead,
    limit = 50,
    offset = 0
}) {

    let query = `
        SELECT
            n.*,
            nr.notification_recipient_id,
            nr.user_id,
            nr.is_read,
            nr.read_at
        FROM notifications n
        INNER JOIN notification_recipients nr
            ON n.notification_id = nr.notification_id
    `;

    const params = [];
    const where = [];

    where.push(`n.deleted_at IS NULL`);

    if (userId) {
        params.push(userId);
        where.push(`nr.user_id = $${params.length}`);
    }

    if (typeof isRead !== "undefined") {
        params.push(isRead === true || isRead === "true");
        where.push(`nr.is_read = $${params.length}`);
    }

    if (where.length) {
        query += ` WHERE ${where.join(" AND ")}`;
    }

    params.push(limit);
    params.push(offset);

    query += `
        ORDER BY n.created_at DESC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
    `;

    const { rows } = await client.query(query, params);

    return rows;
}

async function markAsRead(notificationId, userId) {
    const q = `
        UPDATE notification_recipients
        SET
            is_read = true,
            read_at = NOW()
        WHERE
            notification_id = $1
            AND user_id = $2
        RETURNING *
    `;

    const { rows } = await client.query(q, [notificationId, userId]);

    return rows[0] || null;
}

async function updateNotification(notificationId, patch) {

    // Fields that are allowed to be updated
    const allowedFields = [
        "title",
        "message",
        "notification_type",
        "priority",
        "branch_id",
        "created_by",
        "expires_at"
    ];

    const fields = [];
    const params = [];

    let idx = 1;

    for (const key of Object.keys(patch)) {

        if (!allowedFields.includes(key)) continue;

        fields.push(`${key} = $${idx}`);
        params.push(patch[key]);
        idx++;
    }

    if (!fields.length) {
        return getNotificationById(notificationId);
    }

    // Update timestamp
    fields.push(`updated_at = NOW()`);

    params.push(notificationId);

    const q = `
        UPDATE notifications
        SET ${fields.join(", ")}
        WHERE notification_id = $${idx}
          AND deleted_at IS NULL
        RETURNING *;
    `;

    const { rows } = await client.query(q, params);

    return rows[0] || null;
}

async function deleteNotification(notificationId) {
    const q = `
        UPDATE notifications
        SET
            deleted_at = NOW(),
            updated_at = NOW()
        WHERE notification_id = $1
          AND deleted_at IS NULL
        RETURNING *;
    `;

    const { rows } = await client.query(q, [notificationId]);

    return rows[0] || null;
}

module.exports = {
  createNotification,
  getNotificationById,
  listNotifications,
  markAsRead,
  updateNotification,
  deleteNotification,
};
