module.exports = (err, req, res, next) => {
    console.error(err);

    // PostgreSQL Unique Constraint
    if (err.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "Duplicate record.",
            detail: err.detail
        });
    }

    // PostgreSQL Foreign Key Constraint
    if (err.code === "23503") {
        return res.status(409).json({
            success: false,
            message: "Operation violates database constraints.",
            detail: err.detail
        });
    }

    // PostgreSQL Invalid Input
    if (err.code === "22P02") {
        return res.status(400).json({
            success: false,
            message: "Invalid input."
        });
    }

    return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error."
    });
};