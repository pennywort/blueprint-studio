// TEMPORARY SHIM (owner decision 2026-10-09): internal @blueprint-vendor registry is
// unavailable on this machine, so Flamingo (fork of MUI v4) is backed by
// @material-ui/core 4.12.4. Re-exports only — no logic. Remove when the real
// registry is reachable again.
export { default as Box } from '@material-ui/core/Box';
export { default as Button } from '@material-ui/core/Button';
export { default as Card } from '@material-ui/core/Card';
export { default as CardContent } from '@material-ui/core/CardContent';
export { default as Chip } from '@material-ui/core/Chip';
export { default as CircularProgress } from '@material-ui/core/CircularProgress';
export { default as Dialog } from '@material-ui/core/Dialog';
export { default as DialogActions } from '@material-ui/core/DialogActions';
export { default as DialogContent } from '@material-ui/core/DialogContent';
export { default as DialogContentText } from '@material-ui/core/DialogContentText';
export { default as DialogTitle } from '@material-ui/core/DialogTitle';
export { default as Divider } from '@material-ui/core/Divider';
export { default as Drawer } from '@material-ui/core/Drawer';
export { default as FormControl } from '@material-ui/core/FormControl';
export { default as FormControlLabel } from '@material-ui/core/FormControlLabel';
export { default as Grid } from '@material-ui/core/Grid';
export { default as IconButton } from '@material-ui/core/IconButton';
export { default as InputAdornment } from '@material-ui/core/InputAdornment';
export { default as InputLabel } from '@material-ui/core/InputLabel';
export { default as List } from '@material-ui/core/List';
export { default as ListItem } from '@material-ui/core/ListItem';
export { default as Menu } from '@material-ui/core/Menu';
export { default as MenuItem } from '@material-ui/core/MenuItem';
export { default as MenuList } from '@material-ui/core/MenuList';
export { default as Paper } from '@material-ui/core/Paper';
export { default as Popper } from '@material-ui/core/Popper';
export { default as ClickAwayListener } from '@material-ui/core/ClickAwayListener';
export { default as Popover } from '@material-ui/core/Popover';
export { default as Radio } from '@material-ui/core/Radio';
export { default as RadioGroup } from '@material-ui/core/RadioGroup';
export { default as Select } from '@material-ui/core/Select';
export { default as Snackbar } from '@material-ui/core/Snackbar';
export { default as Switch } from '@material-ui/core/Switch';
export { default as TextField } from '@material-ui/core/TextField';
export { default as Tooltip } from '@material-ui/core/Tooltip';
export { default as Typography } from '@material-ui/core/Typography';
export { createMuiTheme, ThemeProvider, useTheme, makeStyles, createStyles } from '@material-ui/core/styles';
