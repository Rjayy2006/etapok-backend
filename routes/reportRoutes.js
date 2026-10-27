// DELETE Route: Delete report by ID
router.delete('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedReport = await Report.findByIdAndDelete(id);

    if (!deletedReport) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Broadcast delete event in real-time via Socket.IO if configured
    if (req.io) {
      req.io.emit('report_deleted', id);
    }

    res.status(200).json({ message: 'Report deleted successfully', id });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: 'Server error while deleting report' });
  }
});