module.exports = (req, res) => {
    return res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found.`
    });
};