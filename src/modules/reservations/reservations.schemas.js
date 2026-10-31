const { z } = require('zod');

const reservationIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const createReservationBody = z
  .object({
    roomId: z.number().int().positive(),
    participants: z.number().int().positive(),
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
  })
  .strict(); // nieznane pola (np. status, id, userId, reservedBy) -> 400. Właściciel pochodzi z tokenu.

const SORT_VALUES = ['startTime', '-startTime', 'createdAt', '-createdAt', 'participants', '-participants'];

const listReservationsQuery = z
  .object({
    userId: z.coerce.number().int().positive().optional(), // tylko dla ADMINa (sprawdza service)
    roomId: z.coerce.number().int().positive().optional(),
    buildingId: z.coerce.number().int().positive().optional(),
    status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(SORT_VALUES).default('startTime'), // whitelist: nieznana wartość -> 400
  })
  .refine((q) => !q.from || !q.to || new Date(q.from).getTime() < new Date(q.to).getTime(), {
    message: 'from must be earlier than to',
    path: ['to'],
  });

module.exports = { reservationIdParams, createReservationBody, listReservationsQuery };
