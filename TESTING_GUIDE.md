# Employee Report System - Testing Scenarios

## Pre-Test Checklist
- [ ] Backend server running on port 5000
- [ ] Frontend running on port 3000
- [ ] Database migrations completed (`npm run migrate`)
- [ ] Socket.IO connection working
- [ ] Sample employees created in database

---

## Test Scenario 1: Basic Report Submission

### Steps
1. **Login as Employee**
   - Navigate to http://localhost:3000
   - Click "Reports" in navigation
   - Click "New Report" button

2. **Fill Report Form**
   - Title: "System Performance Issue"
   - Description: "Application is running slow during peak hours. The response time has increased significantly in the last week."
   - Report Type: "Issue"
   - Priority: "High"
   - Attachment: Upload any test PDF/image file

3. **Verify Auto-filled Fields**
   - Employee ID: Should be auto-filled
   - Employee Name: Should be auto-filled
   - Department: Should be auto-filled

4. **Submit Report**
   - Click "Submit Report" button
   - Verify success message: "Report submitted successfully!"
   - Should be redirected to "My Reports" page

### Expected Results
- ✓ Report appears in "My Reports" with "Pending" status
- ✓ Report ID is generated (RPT[timestamp])
- ✓ Status badge shows "Pending"
- ✓ Creation date is displayed

---

## Test Scenario 2: View My Reports

### Steps
1. **Navigate to My Reports**
   - Click "Reports" → "My Reports" in employee portal

2. **Verify Report List**
   - See previously submitted report
   - Check columns: Report ID, Title, Type, Priority, Status, Submitted Date
   - Verify pagination controls

3. **Click View Button**
   - Click "View" on the report created in Scenario 1
   - Should open report detail page

4. **Verify Report Details**
   - Status: "Pending"
   - Full description visible
   - Attachment download button available (if file was uploaded)
   - Timeline shows submission date

### Expected Results
- ✓ Report list displays correctly
- ✓ Report details page loads
- ✓ Admin remarks section shows "No remarks yet"
- ✓ Download button works if attachment exists

---

## Test Scenario 3: Admin View Reports

### Steps
1. **Login as Admin**
   - Logout from employee account
   - Login as admin@example.com / Admin@123

2. **Navigate to Reports**
   - Click "Reports" in admin navigation

3. **View Statistics**
   - Verify statistics cards display:
     - Total Reports
     - Pending count (should be at least 1)
     - In Review count
     - Resolved count
     - Rejected count

4. **Search and Filter**
   - Use search: Enter the Report ID
   - Verify report appears in results
   - Click "Filters" button
   - Filter by Status: "Pending"
   - Verify report appears
   - Filter by Department
   - Verify results update

### Expected Results
- ✓ Statistics cards show correct counts
- ✓ Search returns matching reports
- ✓ Filters work correctly
- ✓ Report table updates based on filters

---

## Test Scenario 4: Admin Update Report Status

### Steps
1. **From Admin Reports List**
   - Click "View" button on the "Pending" report

2. **View Report Details**
   - See full report information
   - Download attachment (if available)

3. **Update Report Status**
   - Change Status dropdown from "Pending" to "In Review"
   - Add admin remarks: "This issue has been escalated to the infrastructure team. They are investigating the performance degradation."
   - Click "Update Report" button
   - Verify success message: "Report updated successfully!"

4. **Verify Status Changed**
   - Status badge should now show "In Review"
   - Current Status displays "In Review"

### Expected Results
- ✓ Status changes successfully
- ✓ Admin remarks are saved
- ✓ Updated timestamp changes
- ✓ Employee receives real-time notification (if Socket.IO working)

---

## Test Scenario 5: Real-Time Updates

### Steps
1. **Setup Two Windows**
   - Window 1: Login as Employee (employee portal)
   - Window 2: Login as Admin (admin portal - My Reports page)

2. **Employee Action**
   - In Window 1: Click "Reports" → Navigate to report view
   - Observe: Status shows "Pending"

3. **Admin Update**
   - In Window 2: Find the report and click "View"
   - Change status to "Resolved"
   - Add remarks: "Issue has been fixed"
   - Click "Update Report"

4. **Real-Time Update Check**
   - In Window 1: Observe the status update
   - Should change to "Resolved" in real-time (without refresh)
   - Admin remarks should be visible

### Expected Results
- ✓ Employee sees status change without page refresh
- ✓ Admin remarks are visible to employee
- ✓ Toast notification appears for update
- ✓ Socket.IO connection is functioning

---

## Test Scenario 6: File Upload and Download

### Steps
1. **Submit Report with Attachment**
   - Create new report
   - Upload a test file (PDF, DOC, or image)
   - Submit report

2. **Download from Employee Portal**
   - Go to "My Reports"
   - Click download icon on the report
   - Verify file downloads with correct name

3. **Download from Admin Portal**
   - Go to Admin Reports
   - View the report
   - Click "Download" button in attachment section
   - Verify file downloads

### Expected Results
- ✓ File upload completes successfully
- ✓ File is stored on server
- ✓ Download works from both employee and admin portals
- ✓ File integrity is maintained

---

## Test Scenario 7: Pagination

### Steps
1. **Create Multiple Reports**
   - Submit 15-20 test reports from employee account
   - Use different priorities and types

2. **Test Employee Pagination**
   - Go to "My Reports"
   - Should show 10 items per page
   - Click "Next" button
   - Verify next page loads with remaining reports

3. **Test Admin Pagination**
   - Go to Admin Reports
   - Should show 10 items per page
   - Test "Previous" and "Next" buttons
   - Verify page numbers update

### Expected Results
- ✓ First page shows 10 reports
- ✓ Pagination controls are visible
- ✓ Page numbers display correctly
- ✓ Navigation between pages works

---

## Test Scenario 8: Complete Report Lifecycle

### Steps
1. **Employee Submits Report**
   - Title: "IT Infrastructure Request"
   - Description: "Need additional storage capacity"
   - Type: "Suggestion"
   - Priority: "Medium"

2. **Admin Reviews Report**
   - Check report in admin dashboard
   - View details
   - Add remark: "Forwarding to IT Manager"

3. **Admin Changes Status**
   - Status: "In Review"
   - Update

4. **Employee Reviews Update**
   - Check "My Reports"
   - Verify status changed
   - Read admin remarks

5. **Admin Resolves Report**
   - Change status to "Resolved"
   - Add remark: "Issue has been resolved. Additional storage has been provisioned."
   - Update

6. **Employee Sees Resolution**
   - Check "My Reports"
   - Verify final status
   - Read final remarks

### Expected Results
- ✓ Report progresses through all statuses
- ✓ Admin remarks accumulate
- ✓ Employee sees all updates in real-time
- ✓ Complete lifecycle is tracked

---

## Test Scenario 9: Error Handling

### Steps
1. **Attempt Empty Submission**
   - Click "New Report"
   - Leave Title empty
   - Click "Submit"
   - Verify error message

2. **Attempt Large File Upload**
   - Try to upload file > 10MB
   - Verify error message

3. **Attempt Invalid File Type**
   - Try to upload .exe or other restricted file
   - Verify error message

### Expected Results
- ✓ Required field validation works
- ✓ File size validation works
- ✓ File type validation works
- ✓ Error messages are clear and helpful

---

## Test Scenario 10: Permission Testing

### Steps
1. **Test Employee Permissions**
   - Employee can only see own reports
   - Test by checking database directly (employee_id filter)

2. **Test Admin Permissions**
   - Admin can see all reports
   - Admin can modify report status
   - Employees cannot modify their report status

### Expected Results
- ✓ Employees are restricted to own reports
- ✓ Admins can see all reports
- ✓ Only admins can change status
- ✓ Proper 403 errors for unauthorized access

---

## Performance Testing

### Steps
1. **Load Testing**
   - Create 100+ reports
   - Load reports list
   - Verify pagination works smoothly
   - Test search performance

2. **File Upload**
   - Upload large files (10MB limit)
   - Verify timeout handling
   - Monitor server logs

### Expected Results
- ✓ Page loads within 2 seconds
- ✓ Search executes in < 1 second
- ✓ File upload completes within reasonable time
- ✓ No memory leaks

---

## Troubleshooting Tips

### Issue: Reports not appearing
**Solution**: 
- Verify database migrations ran
- Check user has employee_id assigned
- Check console for API errors

### Issue: File upload fails
**Solution**:
- Check file size < 10MB
- Check file type is allowed
- Verify /uploads directory exists
- Check server logs

### Issue: Real-time updates not working
**Solution**:
- Check Socket.IO connection in browser DevTools
- Verify token is valid
- Check server Socket.IO logs
- Refresh browser if needed

### Issue: Admin can't see reports
**Solution**:
- Verify user role is "admin"
- Check database user role value
- Clear browser cache
- Check API response in Network tab

---

## Checklist Summary

- [ ] Report Submission - Scenario 1
- [ ] My Reports View - Scenario 2
- [ ] Admin Dashboard - Scenario 3
- [ ] Status Update - Scenario 4
- [ ] Real-Time Updates - Scenario 5
- [ ] File Upload/Download - Scenario 6
- [ ] Pagination - Scenario 7
- [ ] Complete Lifecycle - Scenario 8
- [ ] Error Handling - Scenario 9
- [ ] Permissions - Scenario 10
- [ ] Performance - Performance Testing

**All tests passed? ✓ Ready for production!**

---

## Additional Notes

- Enable network throttling in DevTools to test slow connections
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on mobile devices/responsive design
- Monitor server logs during tests
- Check browser console for warnings/errors

---

**Last Updated**: May 27, 2026
**Test Environment**: Development (localhost)
