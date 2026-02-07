// Role-Based Access Control Middleware

// Check if user has one of the required roles
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                message: `This action requires one of these roles: ${roles.join(', ')}`
            });
        }

        next();
    };
}

// Shorthand middlewares
export const requireAdmin = requireRole('admin');
export const requireOrganiser = requireRole('organiser', 'admin');
