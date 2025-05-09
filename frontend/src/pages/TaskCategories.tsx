import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Divider,
  SelectChangeEvent
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  ExpandLess,
  Folder,
  FolderOpen
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { taskCategoryService, TaskCategory, TaskCategoryCreateRequest } from '../api';
import MainLayout from '../components/Layout/MainLayout';

const TaskCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [hierarchicalCategories, setHierarchicalCategories] = useState<TaskCategory[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<TaskCategory | null>(null);
  const [formData, setFormData] = useState<TaskCategoryCreateRequest>({
    name: '',
    parent_id: undefined,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const { enqueueSnackbar } = useSnackbar();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskCategoryService.getAllTaskCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      enqueueSnackbar('Failed to fetch categories', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const fetchHierarchicalCategories = useCallback(async () => {
    try {
      const data = await taskCategoryService.getHierarchicalTaskCategories();
      setHierarchicalCategories(data);
    } catch (error) {
      console.error('Error fetching hierarchical categories:', error);
      enqueueSnackbar('Failed to fetch category hierarchy', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchCategories();
    fetchHierarchicalCategories();
  }, [fetchCategories, fetchHierarchicalCategories]);

  const handleOpenDialog = (category: TaskCategory | null = null) => {
    if (category) {
      // Edit mode
      setCurrentCategory(category);
      setFormData({
        name: category.name || '',
        parent_id: category.parent_id,
        description: category.description || ''
      });
    } else {
      // Create mode
      setCurrentCategory(null);
      setFormData({
        name: '',
        parent_id: undefined,
        description: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value;
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleParentChange = (event: SelectChangeEvent<number | string>) => {
    setFormData({
      ...formData,
      parent_id: event.target.value === '' ? undefined : Number(event.target.value)
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name) {
        enqueueSnackbar('Category name is required', { variant: 'error' });
        return;
      }

      if (currentCategory) {
        // Update existing category
        await taskCategoryService.updateTaskCategory(currentCategory.id, formData);
        enqueueSnackbar('Category updated successfully', { variant: 'success' });
      } else {
        // Create new category
        await taskCategoryService.createTaskCategory(formData);
        enqueueSnackbar('Category created successfully', { variant: 'success' });
      }
      
      handleCloseDialog();
      fetchCategories();
      fetchHierarchicalCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      enqueueSnackbar('Failed to save category', { variant: 'error' });
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (window.confirm('Are you sure you want to delete this category? This will not delete associated tasks, but they will be unlinked from this category.')) {
      try {
        await taskCategoryService.deleteTaskCategory(categoryId);
        setCategories(categories.filter(category => category.id !== categoryId));
        fetchHierarchicalCategories(); // Refresh the hierarchy view
        enqueueSnackbar('Category deleted successfully', { variant: 'success' });
      } catch (error) {
        console.error('Error deleting category:', error);
        enqueueSnackbar('Failed to delete category', { variant: 'error' });
      }
    }
  };

  const toggleExpand = (categoryId: number) => {
    setExpanded({
      ...expanded,
      [categoryId]: !expanded[categoryId]
    });
  };

  const renderCategoryItem = (category: TaskCategory) => {
    const hasChildren = category.children !== undefined && category.children.length > 0;
    const isExpanded = expanded[category.id];

    return (
      <React.Fragment key={category.id}>
        <ListItem 
          onClick={() => hasChildren && toggleExpand(category.id)}
          secondaryAction={
            <Box>
              <IconButton
                edge="end"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDialog(category);
                }}
                title="Edit category"
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                edge="end"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCategory(category.id);
                }}
                title="Delete category"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          <ListItemIcon>
            {hasChildren ? (isExpanded ? <FolderOpen /> : <Folder />) : <Folder />}
          </ListItemIcon>
          <ListItemText 
            primary={category.name} 
            secondary={category.description}
          />
          {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {category.children && category.children.map(child => renderCategoryItem(child))}
            </List>
          </Collapse>
        )}
        <Divider component="li" />
      </React.Fragment>
    );
  };

  return (
    <MainLayout title="Task Categories">
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" component="h1" gutterBottom>
              Task Categories
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Add Category
            </Button>
          </Box>

          <Grid container spacing={3}>
            {/* Hierarchical View */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Category Hierarchy</Typography>
                  {hierarchicalCategories.length === 0 ? (
                    <Typography color="textSecondary">
                      {loading ? 'Loading categories...' : 'No categories found'}
                    </Typography>
                  ) : (
                    <List>
                      {hierarchicalCategories.map(category => renderCategoryItem(category))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Flat view for reference */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>All Categories</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Parent</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categories.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              {loading ? 'Loading categories...' : 'No categories found'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          categories.map((category) => {
                            const parent = categories.find(c => c.id === category.parent_id);
                            return (
                              <TableRow key={category.id}>
                                <TableCell>{category.name}</TableCell>
                                <TableCell>{parent ? parent.name : '-'}</TableCell>
                                <TableCell align="right">
                                  <IconButton 
                                    onClick={() => handleOpenDialog(category)}
                                    title="Edit category"
                                    size="small"
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                  <IconButton 
                                    onClick={() => handleDeleteCategory(category.id)}
                                    title="Delete category"
                                    size="small"
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Category Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{currentCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Category Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <FormControl fullWidth margin="dense" variant="outlined">
              <InputLabel id="parent-label">Parent Category</InputLabel>
              <Select
                labelId="parent-label"
                name="parent_id"
                value={formData.parent_id || ''}
                onChange={handleParentChange}
                label="Parent Category"
              >
                <MenuItem value="">
                  <em>None (Root Category)</em>
                </MenuItem>
                {categories
                  .filter(category => !currentCategory || category.id !== currentCategory.id)
                  .map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.description || ''}
              onChange={handleInputChange}
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {currentCategory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
};

export default TaskCategoriesPage; 