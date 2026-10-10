# Haven — Home services, handled.

Haven is a MERN home-services booking app. Customers can browse services and trusted professionals, request and cancel visits, and review their booking history. Administrators can manage the service and professional catalogs, review all bookings, assign a professional, and update booking status.

## Stack

- **Frontend:** React 18, Vite, Lucide icons, responsive CSS
- **API:** Node.js, Express, JWT authentication
- **Database:** MongoDB with Mongoose models for users, services, providers, and bookings

## Run locally

1. Install Node.js 18+ and run MongoDB locally, or provide a MongoDB connection string.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set `JWT_SECRET` to a long, random value. Set `MONGODB_URI` if MongoDB is not running at the default local address.
4. Seed sample services, professionals, and demo accounts with `npm run seed`.
5. Start the frontend and API with `npm run dev`, then visit <http://localhost:5173>.

For a production build, run `npm run build`; `npm start` starts the API on port 5000. The Vite development server proxies `/api` requests to the API.
Run the API smoke tests with `npm test`.
For the MongoDB-backed authentication and CRUD integration test, set `MONGODB_URI_TEST` to a local MongoDB connection string and run `npm run test:integration`. The test creates and removes a uniquely named temporary database.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Homeowner | `alex@haven.demo` | `haven123` |
| Administrator | `admin@haven.demo` | `haven123` |

The seed command clears existing bookings, users, services, and professionals in the configured database before loading demo data. Do not use these demo credentials or the seed command against a production database.

## API overview

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create a customer account |
| POST | `/api/auth/login` | Public | Sign in and receive a JWT |
| GET | `/api/auth/me` | Signed in | Return the current account |
| GET | `/api/services` | Public | List active services |
| POST, PUT, DELETE | `/api/services` | Administrator | Create, update, or deactivate a service |
| GET | `/api/providers` | Public | List available professionals |
| POST, PUT, DELETE | `/api/providers` | Administrator | Create, update, or deactivate a professional |
| GET | `/api/bookings` | Signed in | List your bookings (administrators see all) |
| POST | `/api/bookings` | Signed in | Request a service visit |
| PUT | `/api/bookings/:id` | Owner or administrator | Cancel your upcoming booking or manage an appointment |
| DELETE | `/api/bookings/:id` | Administrator | Delete a booking |
| GET | `/api/health` | Public | Check API availability |

Send the login/register token as `Authorization: Bearer <token>` on authenticated requests.

## License

This project is licensed under the MIT License; see [LICENSE](./LICENSE). For support, see [SUPPORT,md](./SUPPORT,md).
