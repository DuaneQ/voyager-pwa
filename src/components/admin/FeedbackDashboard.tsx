// Admin feedback dashboard (for your internal use)
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as BugIcon,
  Lightbulb as IdeaIcon,
  Speed as ImprovementIcon,
  Chat as GeneralIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getFirestore } from 'firebase/firestore';
import { app } from '../../environments/firebaseConfig';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'improvement' | 'general';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rating?: number;
  status: 'new' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  userId?: string;
  userEmail?: string;
  createdAt: any;
  deviceInfo?: any;
  version?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
}

export const FeedbackDashboard: React.FC = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const db = getFirestore(app);
    const feedbackQuery = query(
      collection(db, 'feedback'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      const feedbackData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedbackItem[];
      
      setFeedback(feedbackData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <BugIcon color="error" />;
      case 'feature':
        return <IdeaIcon color="warning" />;
      case 'improvement':
        return <ImprovementIcon color="info" />;
      default:
        return <GeneralIcon color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'error';
      case 'in-progress':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    try {
      const db = getFirestore(app);
      await updateDoc(doc(db, 'feedback', feedbackId), {
        status: newStatus,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating feedback status:', error);
    }
  };

  const filteredFeedback = feedback.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const stats = {
    total: feedback.length,
    bugs: feedback.filter(f => f.type === 'bug').length,
    features: feedback.filter(f => f.type === 'feature').length,
    improvements: feedback.filter(f => f.type === 'improvement').length,
    newItems: feedback.filter(f => f.status === 'new').length,
    critical: feedback.filter(f => f.severity === 'critical').length,
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Feedback Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Beta Feedback Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">{stats.total}</Typography>
              <Typography variant="body2">Total Feedback</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error">{stats.bugs}</Typography>
              <Typography variant="body2">Bug Reports</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">{stats.features}</Typography>
              <Typography variant="body2">Feature Requests</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">{stats.improvements}</Typography>
              <Typography variant="body2">Improvements</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error">{stats.newItems}</Typography>
              <Typography variant="body2">New Items</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error">{stats.critical}</Typography>
              <Typography variant="body2">Critical</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title or description..."
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="bug">Bug Reports</MenuItem>
                <MenuItem value="feature">Feature Requests</MenuItem>
                <MenuItem value="improvement">Improvements</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Feedback Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFeedback.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getTypeIcon(item.type)}
                    <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                      {item.type}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.description.substring(0, 60)}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    size="small"
                    color={getStatusColor(item.status) as any}
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  {item.severity && (
                    <Chip
                      label={item.severity}
                      size="small"
                      color={getSeverityColor(item.severity) as any}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {item.rating && (
                    <Rating value={item.rating} readOnly size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {item.userEmail || item.userId || 'Anonymous'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {new Date(item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => setSelectedFeedback(item)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Feedback Detail Modal */}
      <Dialog
        open={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedFeedback && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {getTypeIcon(selectedFeedback.type)}
                {selectedFeedback.title}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={selectedFeedback.status}
                  color={getStatusColor(selectedFeedback.status) as any}
                  variant="outlined"
                />
                {selectedFeedback.severity && (
                  <Chip
                    label={selectedFeedback.severity}
                    color={getSeverityColor(selectedFeedback.severity) as any}
                  />
                )}
                {selectedFeedback.rating && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating value={selectedFeedback.rating} readOnly size="small" />
                    <Typography variant="caption">
                      ({selectedFeedback.rating}/5)
                    </Typography>
                  </Box>
                )}
              </Box>

              <Typography variant="body1" paragraph>
                {selectedFeedback.description}
              </Typography>

              {selectedFeedback.stepsToReproduce && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Steps to Reproduce</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedFeedback.stepsToReproduce}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              {selectedFeedback.expectedBehavior && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Expected Behavior</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>{selectedFeedback.expectedBehavior}</Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              {selectedFeedback.actualBehavior && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Actual Behavior</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>{selectedFeedback.actualBehavior}</Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Technical Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="caption" component="div">
                    <strong>User ID:</strong> {selectedFeedback.userId || 'Anonymous'}<br />
                    <strong>Email:</strong> {selectedFeedback.userEmail || 'Not provided'}<br />
                    <strong>Version:</strong> {selectedFeedback.version || 'Unknown'}<br />
                    <strong>Device:</strong> {selectedFeedback.deviceInfo?.platform || 'Unknown'}<br />
                    <strong>Screen:</strong> {selectedFeedback.deviceInfo?.screenResolution || 'N/A'}<br />
                    <strong>Page:</strong> {selectedFeedback.deviceInfo?.url || 'N/A'}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </DialogContent>
            <DialogActions>
              <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedFeedback.status}
                  label="Status"
                  onChange={(e) => {
                    updateFeedbackStatus(selectedFeedback.id, e.target.value);
                    setSelectedFeedback({ ...selectedFeedback, status: e.target.value as any });
                  }}
                >
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
              <Button onClick={() => setSelectedFeedback(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
