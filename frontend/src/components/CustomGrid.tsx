import React from 'react';
import { Grid as MuiGrid, Box } from '@mui/material';

// This component wraps the Material-UI Grid to provide proper typescript typing
// for the common use cases in this project
interface CustomGridProps {
  children: React.ReactNode;
  container?: boolean;
  item?: boolean;
  xs?: number | 'auto';
  sm?: number | 'auto';
  md?: number | 'auto';
  lg?: number | 'auto';
  xl?: number | 'auto';
  spacing?: number;
  sx?: any;
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
}

export const Grid: React.FC<CustomGridProps> = (props) => {
  const { children, item, ...otherProps } = props;
  
  // If this is meant to be a Grid item
  if (item) {
    return (
      <Box 
        sx={{ 
          flexGrow: 1, 
          width: props.xs === 12 ? '100%' : 'auto',
          flexBasis: {
            xs: props.xs === 12 ? '100%' : 'auto',
            sm: props.sm === 12 ? '100%' : (props.sm === 6 ? '48%' : 'auto'),
            md: props.md === 12 ? '100%' : (props.md === 6 ? '48%' : 'auto'),
            lg: props.lg === 12 ? '100%' : (props.lg === 6 ? '48%' : 'auto'),
            xl: props.xl === 12 ? '100%' : (props.xl === 6 ? '48%' : 'auto'),
          },
          ...props.sx 
        }}
      >
        {children}
      </Box>
    );
  }

  // If this is a Grid container
  return (
    <MuiGrid 
      container
      spacing={props.spacing}
      justifyContent={props.justifyContent}
      alignItems={props.alignItems}
      sx={props.sx}
    >
      {children}
    </MuiGrid>
  );
};

export default Grid; 