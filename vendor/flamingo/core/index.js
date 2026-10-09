// TEMPORARY SHIM (owner decision 2026-10-09): internal @sber-friend registry is
// unavailable on this machine, so Flamingo (fork of MUI v4) is backed by
// @material-ui/core 4.12.4. Re-exports only — no logic. Remove when the real
// registry is reachable again.
export { default as Box } from '@material-ui/core/Box';
export { default as Button } from '@material-ui/core/Button';
export { default as Card } from '@material-ui/core/Card';
export { default as CardContent } from '@material-ui/core/CardContent';
export { default as Chip } from '@material-ui/core/Chip';
export { default as CircularProgress } from '@material-ui/core/CircularProgress';
export { default as Divider } from '@material-ui/core/Divider';
export { default as Drawer } from '@material-ui/core/Drawer';
export { default as Grid } from '@material-ui/core/Grid';
export { default as IconButton } from '@material-ui/core/IconButton';
export { default as InputAdornment } from '@material-ui/core/InputAdornment';
export { default as List } from '@material-ui/core/List';
export { default as ListItem } from '@material-ui/core/ListItem';
export { default as Menu } from '@material-ui/core/Menu';
export { default as MenuItem } from '@material-ui/core/MenuItem';
export { default as Popover } from '@material-ui/core/Popover';
export { default as Snackbar } from '@material-ui/core/Snackbar';
export { default as Switch } from '@material-ui/core/Switch';
export { default as TextField } from '@material-ui/core/TextField';
export { default as Tooltip } from '@material-ui/core/Tooltip';
export { default as Typography } from '@material-ui/core/Typography';
export { createMuiTheme, ThemeProvider, useTheme, makeStyles, createStyles } from '@material-ui/core/styles';
