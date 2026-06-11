# Employee Report Submission & Admin Management System

## Complete Implementation Guide

This document outlines the complete end-to-end implementation of the Employee Report Submission and Admin Management flow.

---

## 📋 Feature Overview

### Employee Portal Features
- **Report Submission Form** - Create and submit reports with:
  - Auto-filled employee info (ID, Name, Department)
  - Report Title and Description
  - Report Type (Issue, Complaint, Feedback, Suggestion, Other)
  - Priority Level (Low, Medium, High, Urgent)
  - Optional file attachments (up to 10MB)

- **My Reports Page** - View all submitted reports with:
  - Report status badges (Pending, In Review, Resolved, Rejected)
  - Priority indicators
  - Submission dates
  - Download attachments
  - Pagination support
  - Individual report detail view

- **Report Detail View** - See:
  - Full report content
  - Current status with timeline
  - Admin remarks and comments
  - Download uploaded files
  - Status history

### Admin Portal Features
- **Reports Management Dashboard** - Monitor all employee reports with:
  - Statistics cards (Total, Pending, In Review, Resolved, Rejected)
  - Advanced filtering (Status, Department, Employee, Date)
  - Search functionality (Report ID, Title, Description)
  - Responsive data table with pagination
  - Real-time updates for new reports

- **Report Detail & Update** - Manage individual reports:
  - View complete report information
  - Download employee attachments
  - Change report status
  - Add/update admin remarks
  - View submission timeline

---

## 🗄️ Database Schema

### Reports Table
```sql
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(50) UNIQUE NOT NULL,          -- Auto-generated
  employee_id INTEGER REFERENCES employees(id),
  employee_name VARCHAR(255) NOT NULL,            -- Auto-filled
  department VARCHAR(100),                        -- Auto-filled
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  report_type VARCHAR(100),                       -- Issue, Complaint, Feedback, Suggestion, Other
  priority VARCHAR(20) DEFAULT 'Medium',         -- Low, Medium, High, Urgent
  attachment VARCHAR(500),                        -- File path
  status VARCHAR(50) DEFAULT 'Pending',          -- Pending, In Review, Resolved, Rejected
  admin_remarks TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- `idx_reports_employee` - For employee report queries
- `idx_reports_status` - For filtering by status
- `idx_reports_department` - For department filtering
- `idx_reports_created_at` - For date-based queries

---

## 🔌 API Endpoints

### Employee Endpoints

#### Create Report
```
POST /api/reports/create
Content-Type: multipart/form-data

Body:
{
  title: string,
  description: string,
  reportType: string,
  priority: string,
  attachment: file (optional)
}

Response:
{
  success: true,
  message: "Report submitted successfully",
  data: {
    id: number,
    report_id: string,
    employee_id: number,
    employee_name: string,
    department: string,
    title: string,
    description: string,
    reportType: string,
    priority: string,
    status: "Pending",
    attachment: string | null,
    created_at: timestamp,
    updated_at: timestamp
  }
}
```

#### Get My Reports
```
GET /api/reports/my-reports?page=1&limit=10

Response:
{
  success: true,
  data: [report objects],
  pagination: {
    total: number,
    page: number,
    limit: number,
    pages: number
  }
}
```

### Admin Endpoints

#### Get All Reports
```
GET /api/reports/admin/all?status=Pending&department=IT&search=term&page=1&limit=10

Response:
{
  success: true,
  data: [report objects],
  pagination: { ... }
}
```

#### Get Report Statistics
```
GET /api/reports/admin/stats

Response:
{
  success: true,
  data: {
    total: number,
    pending: number,
    inReview: number,
    resolved: number,
    rejected: number
  }
}
```

#### Get Report Details
```
GET /api/reports/admin/:id

Response:
{
  success: true,
  data: {report object}
}
```

#### Update Report
```
PUT /api/reports/admin/:id

Body:
{
  status: string,           -- Optional
  adminRemarks: string      -- Optional
}

Response:
{
  success: true,
  message: "Report updated successfully",
  data: {updated report object}
}
```

#### Download Attachment
```
GET /api/reports/download/:id

Response: Binary file stream
```

---

## ⚡ Real-Time Updates (Socket.IO)

### Events

#### Report Submission (Employee → Admin)
```javascript
socket.emit('report:submitted', {
  reportId: string,
  employeeName: string,
  title: string,
  timestamp: date
});

// Received by: admin_room
socket.on('report:new', (reportData) => {
  // Update admin dashboard in real-time
});
```

#### Report Status Changed (Admin → Employee)
```javascript
socket.emit('report:statusChanged', {
  reportId: string,
  status: string,
  userId: number,
  adminRemarks: string
});

// Received by: specific user
socket.on('report:updated', (reportData) => {
  // Notify employee of status change
});
```

---

## 🎨 Frontend Components

### Directory Structure
```
client/src/
├── pages/
│   ├── admin/
│   │   ├── Reports.jsx              -- Admin reports list
│   │   └── AdminReportDetail.jsx    -- Admin report detail
│   └── employee/
│       ├── ReportSubmission.jsx     -- Submit report form
│       ├── MyReports.jsx            -- Employee reports list
│       └── EmployeeReportDetail.jsx -- Employee report detail
├── store/slices/
│   └── reportSlice.js               -- Redux state management
└── lib/
    └── socket.js                    -- Socket.IO utilities
```

### Redux State
```javascript
reports: {
  myReports: [],                      // Employee's reports
  allReports: [],                     // Admin's all reports
  currentReport: null,                // Selected report detail
  statistics: {
    total, pending, inReview, resolved, rejected
  },
  pagination: {
    total, page, limit, pages
  },
  loading: boolean,
  error: string | null
}
```

### Redux Actions
- `createReport(formData)`
- `getMyReports({ page, limit })`
- `getAllReports({ status, department, employeeId, search, page, limit })`
- `getReportById(id)`
- `updateReport({ id, status, adminRemarks })`
- `getReportStatistics()`
- `downloadAttachment(id)`

---

## 🚀 File Upload Configuration

### Multer Setup
- **Storage**: Local disk (`/uploads` directory)
- **Max Size**: 10MB
- **Allowed Types**:
  - Documents: PDF, DOC, DOCX, XLS, XLSX, TXT
  - Images: JPG, PNG

### Security
- Files are validated on both client and server
- File type checking via MIME types
- File size enforcement
- Secure file naming (timestamp + random suffix)

---

## 🔄 Complete User Flow

### Employee Flow
1. **Navigate** to "Reports" in employee portal
2. **Click** "New Report" button
3. **Fill Form**:
   - Auto-filled: Employee ID, Name, Department
   - Enter: Title, Description
   - Select: Report Type, Priority
   - Optionally: Upload file
4. **Submit** report
5. **View** in "My Reports"
6. **Track** status changes in real-time
7. **View** admin remarks when updated
8. **Download** attachments anytime

### Admin Flow
1. **Navigate** to "Reports" in admin portal
2. **View** statistics cards
3. **Filter/Search** reports
4. **Click** "View" on specific report
5. **Review** report details
6. **Download** attachment if exists
7. **Update** status (Pending → In Review → Resolved/Rejected)
8. **Add** admin remarks/comments
9. **Submit** update
10. **Employee** receives real-time notification

---

## 🧪 Testing Guide

### Manual Testing Steps

#### Test Report Creation
1. Login as employee
2. Navigate to Report Submission
3. Fill in all fields
4. Upload a test PDF file
5. Click Submit
6. Verify success message
7. Check "My Reports" to see it

#### Test Filtering & Search
1. Login as admin
2. Go to Reports Management
3. Use filters (Status, Department)
4. Use search (Report ID, Title)
5. Verify correct results

#### Test Admin Update
1. Click "View" on a report
2. Change status to "In Review"
3. Add remarks
4. Click "Update Report"
5. Verify update success
6. Employee receives notification in real-time

#### Test File Download
1. In My Reports or Admin Reports
2. Click download icon on report with attachment
3. Verify file downloads correctly

---

## 🔒 Security Features

### Authentication
- All routes protected with JWT middleware
- Employee can only see own reports
- Only admins can modify report status

### File Upload Security
- File type validation (MIME type)
- File size limits (10MB)
- Secure file naming
- Quarantined upload directory

### Data Validation
- Required field validation
- Status enum validation
- Input sanitization

---

## 📦 Dependencies

### Backend
- `express` - Web framework
- `multer` - File upload handling
- `socket.io` - Real-time communication
- `pg` - PostgreSQL client

### Frontend
- `react` - UI framework
- `redux-toolkit` - State management
- `react-router-dom` - Routing
- `socket.io-client` - Socket communication
- `lucide-react` - Icons
- `react-hot-toast` - Notifications
- `axios` - HTTP client

---

## 🛠️ Troubleshooting

### Issue: Reports not appearing in admin dashboard
**Solution**: Check Socket.IO connection, verify admin is in "admin_room"

### Issue: File upload fails
**Solution**: Check file size, type, and ensure `/uploads` directory exists

### Issue: Real-time updates not working
**Solution**: Verify Socket.IO is connected, check browser console for errors

### Issue: Report status not updating
**Solution**: Ensure admin has correct permissions, check API response

---

## 🔮 Future Enhancements

1. **Email Notifications** - Send emails on report submission/update
2. **Export Reports** - Export to Excel/PDF
3. **Activity Log** - Track all changes to reports
4. **Report Templates** - Pre-defined templates for common issues
5. **Report Analytics** - Dashboard with charts and insights
6. **Multi-level Approval** - Approval workflow
7. **Comments Thread** - Threaded discussions on reports
8. **Report Escalation** - Auto-escalate pending reports

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review the code comments
3. Check backend logs
4. Check browser console (frontend)
5. Verify database connectivity

---

**Implementation Date**: May 2026
**Last Updated**: May 27, 2026
**Status**: Fully Implemented
