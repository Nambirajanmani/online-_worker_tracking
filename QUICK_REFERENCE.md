# 📁 Quick Reference - File Structure & Locations

## Backend Files

### Models
- **`server/models/Report.js`**
  - Database operations for reports
  - Methods: `create`, `findById`, `findByReportId`, `findByEmployeeId`, `findAll`, `update`, `getStatistics`, `delete`

### Controllers
- **`server/controllers/reportController.js`**
  - Business logic for report operations
  - Functions: `createReport`, `getMyReports`, `getAllReports`, `getReportById`, `updateReport`, `getReportStatistics`, `downloadAttachment`, `getOverviewReport`

### Routes
- **`server/routes/reportRoutes.js`**
  - API endpoint definitions
  - Multer file upload configuration
  - All report endpoints

### Database
- **`server/config/database.js`**
  - Reports table schema creation
  - Database migration logic
  - Indices for performance

### Real-Time
- **`server/sockets/socketHandler.js`**
  - Socket.IO event handlers
  - Report submission and update events
  - Admin and employee room management

---

## Frontend Files

### State Management
- **`client/src/store/slices/reportSlice.js`**
  - Redux slice for report state
  - Actions: create, get, update, download
  - Thunks for async operations
  - Reducers for state updates

### Pages - Employee
- **`client/src/pages/employee/ReportSubmission.jsx`**
  - Form to submit new report
  - Auto-filled employee info
  - File upload with validation
  - Success/error handling

- **`client/src/pages/employee/MyReports.jsx`**
  - List of employee's reports
  - Status badges and filtering
  - Pagination support
  - Download functionality

- **`client/src/pages/employee/EmployeeReportDetail.jsx`**
  - Individual report view
  - Admin remarks section
  - Timeline of updates
  - File download

### Pages - Admin
- **`client/src/pages/admin/Reports.jsx`**
  - Dashboard with statistics
  - Advanced filtering and search
  - Reports data table
  - Real-time updates

- **`client/src/pages/admin/AdminReportDetail.jsx`**
  - Report detail view
  - Status update form
  - Admin remarks input
  - Download functionality

### Routing
- **`client/src/App.js`**
  - Route definitions for all report pages
  - Protected route configuration
  - Role-based access control

### Utilities
- **`client/src/lib/socket.js`**
  - Socket.IO event handlers
  - Report-specific socket functions
  - Connection management

### Dependencies
- **`client/package.json`**
  - lucide-react added for icons
  - All other dependencies listed

---

## Configuration Files

### Server
- **`server/.env`** (create from .env.example)
  - Database credentials
  - JWT secret
  - API configuration

### Frontend
- **`client/.env.local`** (create)
  - `REACT_APP_API_URL=http://localhost:5000/api`
  - `REACT_APP_SOCKET_URL=http://localhost:5000`

---

## Documentation Files

### Main Documentation
1. **`REPORTS_FEATURE_GUIDE.md`** - Complete feature documentation
2. **`TESTING_GUIDE.md`** - Test scenarios and procedures
3. **`IMPLEMENTATION_SUMMARY.md`** - This summary document
4. **`SETUP.sh`** - Setup and installation script

### Reference
- **`/memories/repo/reports-feature.md`** - Repository memory with quick notes

---

## API Endpoints Quick Reference

### Employee Endpoints
```
POST   /api/reports/create           Submit new report
GET    /api/reports/my-reports       Get own reports (paginated)
```

### Admin Endpoints
```
GET    /api/reports/admin/all        Get all reports (filterable)
GET    /api/reports/admin/stats      Get statistics
GET    /api/reports/admin/:id        Get report details
PUT    /api/reports/admin/:id        Update status & remarks
GET    /api/reports/download/:id     Download attachment
```

---

## Redux Store Structure

```javascript
{
  reports: {
    myReports: [],                    // Employee's reports
    allReports: [],                   // Admin's all reports
    currentReport: null,              // Selected report
    statistics: {
      total: number,
      pending: number,
      inReview: number,
      resolved: number,
      rejected: number
    },
    pagination: {
      total: number,
      page: number,
      limit: number,
      pages: number
    },
    loading: boolean,
    error: string | null
  }
}
```

---

## Redux Actions

```javascript
// Submit report
dispatch(createReport(formData))

// Get employee's reports
dispatch(getMyReports({ page: 1, limit: 10 }))

// Get all reports (admin)
dispatch(getAllReports({ 
  status: 'Pending',
  department: 'IT',
  search: 'term',
  page: 1,
  limit: 10
}))

// Get single report
dispatch(getReportById(id))

// Update report
dispatch(updateReport({ 
  id,
  status: 'Resolved',
  adminRemarks: 'text'
}))

// Get statistics
dispatch(getReportStatistics())

// Download attachment
dispatch(downloadAttachment(id))
```

---

## Socket.IO Events

```javascript
// Listen for updates
listenForReportUpdates((data) => {
  // Handle report:new or report:updated
})

// Emit submission
emitReportSubmitted(reportData)

// Emit status change
emitReportStatusChanged(reportData)

// Remove listeners
removeReportListeners()
```

---

## Database Tables

### reports
- Primary key: `id`
- Unique key: `report_id`
- Foreign keys: `employee_id` → employees(id)
- Indices: employee_id, status, department, created_at

### Columns
```
id, report_id, employee_id, employee_name, department,
title, description, report_type, priority, attachment,
status, admin_remarks, created_at, updated_at
```

---

## Component Props

### ReportSubmission
- No props required
- Uses Redux for state
- Auto-fills from user in Redux store

### MyReports
- No props required
- Uses Redux for state
- Manages pagination internally

### EmployeeReportDetail
- URL param: `:id` (report ID)
- Uses Redux for state

### Reports (Admin)
- No props required
- Uses Redux for state
- Manages filters internally

### AdminReportDetail
- URL param: `:id` (report ID)
- Uses Redux for state

---

## Key Features Checklist

### Employee Portal
- [ ] Navigate to Reports section
- [ ] Click "New Report" to submit
- [ ] Auto-filled fields (ID, Name, Dept)
- [ ] Fill required fields
- [ ] Optional file upload
- [ ] View all reports in "My Reports"
- [ ] Click "View" to see details
- [ ] See status and admin remarks
- [ ] Download attachments

### Admin Portal
- [ ] View Reports dashboard
- [ ] See statistics cards
- [ ] Use filters and search
- [ ] Click "View" on report
- [ ] Update report status
- [ ] Add admin remarks
- [ ] Save changes
- [ ] Download employee files

---

## Running the Application

### 1. Install Dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Database Setup
```bash
cd server
npm run migrate
```

### 3. Start Servers
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm start
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Admin Login: admin@example.com / Admin@123

---

## Common Commands

### Backend
```bash
npm run dev          # Start with nodemon
npm start            # Start production
npm run migrate      # Run database migrations
npm run seed         # Seed database
```

### Frontend
```bash
npm start            # Start development server
npm run build        # Build for production
npm test             # Run tests
```

---

## Environment Variables

### Server (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=employee_tracking
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=5000
```

### Client (.env.local)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## Troubleshooting

### File Not Found
- Check exact filename and path
- File names are case-sensitive
- Verify relative imports

### Port Already In Use
- Change PORT in .env
- Kill process: `lsof -i :5000`

### Database Connection Failed
- Check .env variables
- Verify PostgreSQL is running
- Test connection manually

### Socket.IO Not Connecting
- Check browser DevTools Network tab
- Verify backend is running
- Check auth token in localStorage

### File Upload Not Working
- Verify `/uploads` directory exists
- Check file size < 10MB
- Check file type is allowed
- Check server logs

---

## File Size Reference

- Max upload: 10MB
- Allowed types: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT
- Database VARCHAR: 255-500 characters for paths

---

## Performance Tips

- Use pagination (default: 10 per page)
- Create database indices
- Enable compression middleware
- Use lazy loading for components
- Cache report statistics
- Optimize images before upload

---

## Security Checklist

- ✅ Use HTTPS in production
- ✅ Validate all inputs
- ✅ Sanitize file uploads
- ✅ Use strong JWT secret
- ✅ Enable CORS properly
- ✅ Rate limit API endpoints
- ✅ Hash passwords with bcrypt
- ✅ Protect sensitive data

---

**Last Updated**: May 27, 2026
**Version**: 1.0.0
**Status**: Production Ready
