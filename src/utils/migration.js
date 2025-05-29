import { PrismaClient } from '@prisma/client';
import storage from './storage';

const prisma = new PrismaClient();

/**
 * Migration utility for moving data from localStorage to PostgreSQL database
 */
class MigrationUtil {
  /**
   * Migrate all data from localStorage to PostgreSQL
   * @param {Object} options - Migration options
   * @param {Function} options.onProgress - Progress callback (percent, message)
   * @param {boolean} options.clearAfterMigration - Whether to clear localStorage after migration
   * @returns {Promise<Object>} Migration results
   */
  async migrateAll(options = {}) {
    const { onProgress = () => {}, clearAfterMigration = false } = options;
    
    try {
      onProgress(0, 'Iniciando migración...');
      
      // Create default admin user if none exists
      await this.ensureAdminUser();
      onProgress(5, 'Usuario admin creado si no existía');
      
      // Migrate hotels
      const hotelsResult = await this.migrateHotels();
      onProgress(20, `${hotelsResult.count} hoteles migrados`);
      
      // Migrate guests
      const guestsResult = await this.migrateGuests(hotelsResult.idMap);
      onProgress(35, `${guestsResult.count} huéspedes migrados`);
      
      // Migrate services
      const servicesResult = await this.migrateServices(hotelsResult.idMap, guestsResult.idMap);
      onProgress(55, `${servicesResult.count} servicios migrados`);
      
      // Migrate bag labels
      const labelsResult = await this.migrateBagLabels(hotelsResult.idMap, servicesResult.idMap);
      onProgress(75, `${labelsResult.count} etiquetas migradas`);
      
      // Migrate transactions
      const transactionsResult = await this.migrateTransactions(hotelsResult.idMap, servicesResult.idMap);
      onProgress(95, `${transactionsResult.count} transacciones migradas`);
      
      // Clear localStorage if requested
      if (clearAfterMigration) {
        this.clearLocalStorage();
        onProgress(100, 'Almacenamiento local limpiado');
      } else {
        onProgress(100, 'Migración completada');
      }
      
      return {
        success: true,
        message: 'Migración completada exitosamente',
        counts: {
          hotels: hotelsResult.count,
          guests: guestsResult.count,
          services: servicesResult.count,
          bagLabels: labelsResult.count,
          transactions: transactionsResult.count
        }
      };
    } catch (error) {
      console.error('Migration error:', error);
      
      return {
        success: false,
        message: `Error en migración: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Ensure an admin user exists in the database
   * @returns {Promise<Object>} Admin user
   */
  async ensureAdminUser() {
    try {
      // Check if any admin user exists
      const adminExists = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });
      
      if (adminExists) {
        return adminExists;
      }
      
      // Create default admin user
      const admin = await prisma.user.create({
        data: {
          name: 'Administrador',
          email: 'admin@fumylimp.com',
          // Default password: 'admin123'
          password: '$2a$10$KJQlO5/2Uf4GlvYcLjSB3Osph1TaQVpNF30F3H3KTOhCTZDm2kKnK',
          role: 'ADMIN',
          isActive: true
        }
      });
      
      return admin;
    } catch (error) {
      console.error('Error ensuring admin user:', error);
      throw error;
    }
  }
  
  /**
   * Migrate hotels from localStorage to PostgreSQL
   * @returns {Promise<Object>} Migration results with ID mapping
   */
  async migrateHotels() {
    try {
      // Get hotels from localStorage
      const hotels = storage.getItem('hotels') || [];
      
      if (!hotels.length) {
        return { count: 0, idMap: {} };
      }
      
      // ID mapping from localStorage to database
      const idMap = {};
      let count = 0;
      
      // Migrate each hotel
      for (const hotel of hotels) {
        // Check if hotel already exists (by name)
        const existingHotel = await prisma.hotel.findFirst({
          where: { name: hotel.name }
        });
        
        if (existingHotel) {
          idMap[hotel.id] = existingHotel.id;
          continue;
        }
        
        // Create hotel in database
        const createdHotel = await prisma.hotel.create({
          data: {
            name: hotel.name,
            address: hotel.address || '',
            phone: hotel.phone || '',
            email: hotel.email || '',
            contactPerson: hotel.contactPerson || '',
            zone: hotel.zone || 'CENTRAL',
            pricePerKg: parseFloat(hotel.pricePerKg) || 0,
            bagInventory: parseInt(hotel.bagInventory) || 0,
            inventoryThreshold: parseInt(hotel.inventoryThreshold) || 10,
            isActive: hotel.isActive !== false,
            notes: hotel.notes || ''
          }
        });
        
        // Map localStorage ID to database ID
        idMap[hotel.id] = createdHotel.id;
        count++;
      }
      
      return { count, idMap };
    } catch (error) {
      console.error('Error migrating hotels:', error);
      throw error;
    }
  }
  
  /**
   * Migrate guests from localStorage to PostgreSQL
   * @param {Object} hotelIdMap - Hotel ID mapping from localStorage to database
   * @returns {Promise<Object>} Migration results with ID mapping
   */
  async migrateGuests(hotelIdMap) {
    try {
      // Get guests from localStorage
      const guests = storage.getItem('guests') || [];
      
      if (!guests.length) {
        return { count: 0, idMap: {} };
      }
      
      // ID mapping from localStorage to database
      const idMap = {};
      let count = 0;
      
      // Migrate each guest
      for (const guest of guests) {
        // Skip guests with missing required data
        if (!guest.name || !guest.hotelId || !hotelIdMap[guest.hotelId]) {
          continue;
        }
        
        // Check if guest already exists (by name and room)
        const existingGuest = await prisma.guest.findFirst({
          where: {
            name: guest.name,
            roomNumber: guest.roomNumber,
            hotelId: hotelIdMap[guest.hotelId]
          }
        });
        
        if (existingGuest) {
          idMap[guest.id] = existingGuest.id;
          continue;
        }
        
        // Parse dates
        const checkInDate = guest.checkInDate ? new Date(guest.checkInDate) : new Date();
        const checkOutDate = guest.checkOutDate ? new Date(guest.checkOutDate) : null;
        
        // Create guest in database
        const createdGuest = await prisma.guest.create({
          data: {
            hotelId: hotelIdMap[guest.hotelId],
            name: guest.name,
            email: guest.email || '',
            phone: guest.phone || '',
            roomNumber: guest.roomNumber || '',
            checkInDate,
            checkOutDate,
            idType: guest.idType || '',
            idNumber: guest.idNumber || '',
            nationality: guest.nationality || '',
            notes: guest.notes || '',
            isActive: guest.isActive !== false
          }
        });
        
        // Map localStorage ID to database ID
        idMap[guest.id] = createdGuest.id;
        count++;
      }
      
      return { count, idMap };
    } catch (error) {
      console.error('Error migrating guests:', error);
      throw error;
    }
  }
  
  /**
   * Migrate services from localStorage to PostgreSQL
   * @param {Object} hotelIdMap - Hotel ID mapping from localStorage to database
   * @param {Object} guestIdMap - Guest ID mapping from localStorage to database
   * @returns {Promise<Object>} Migration results with ID mapping
   */
  async migrateServices(hotelIdMap, guestIdMap) {
    try {
      // Get services from localStorage
      const services = storage.getItem('services') || [];
      
      if (!services.length) {
        return { count: 0, idMap: {} };
      }
      
      // ID mapping from localStorage to database
      const idMap = {};
      let count = 0;
      
      // Migrate each service
      for (const service of services) {
        // Skip services with missing required data
        if (!service.hotelId || !hotelIdMap[service.hotelId]) {
          continue;
        }
        
        // Check if service already exists (by unique identifiers)
        const existingService = await prisma.service.findFirst({
          where: {
            hotelId: hotelIdMap[service.hotelId],
            guestId: service.guestId ? guestIdMap[service.guestId] : null,
            guestName: service.guestName,
            roomNumber: service.roomNumber,
            createdAt: service.createdAt ? new Date(service.createdAt) : undefined
          }
        });
        
        if (existingService) {
          idMap[service.id] = existingService.id;
          continue;
        }
        
        // Parse dates
        const createdAt = service.createdAt ? new Date(service.createdAt) : new Date();
        const pickupDate = service.pickupDate ? new Date(service.pickupDate) : null;
        const processingDate = service.processingDate ? new Date(service.processingDate) : null;
        const readyDate = service.readyDate ? new Date(service.readyDate) : null;
        const deliveryDate = service.deliveryDate ? new Date(service.deliveryDate) : null;
        const partialDeliveryDate = service.partialDeliveryDate ? new Date(service.partialDeliveryDate) : null;
        
        // Create service in database
        const createdService = await prisma.service.create({
          data: {
            hotelId: hotelIdMap[service.hotelId],
            guestId: service.guestId ? guestIdMap[service.guestId] : null,
            guestName: service.guestName || '',
            roomNumber: service.roomNumber || '',
            status: service.status || 'PENDING',
            priority: service.priority || 'NORMAL',
            weight: parseFloat(service.weight) || null,
            estimatedPrice: parseFloat(service.estimatedPrice) || null,
            finalPrice: parseFloat(service.finalPrice) || null,
            pickupDate,
            processingDate,
            readyDate,
            deliveryDate,
            partialDeliveryDate,
            deliveredPercentage: parseInt(service.deliveredPercentage) || null,
            pickupSignature: service.pickupSignature || null,
            deliverySignature: service.deliverySignature || null,
            partialDeliverySignature: service.partialDeliverySignature || null,
            pickupPhotos: service.pickupPhotos || [],
            processPhotos: service.processPhotos || [],
            deliveryPhotos: service.deliveryPhotos || [],
            damagedItemPhotos: service.damagedItemPhotos || [],
            pickupNotes: service.pickupNotes || '',
            statusNotes: service.statusNotes || '',
            deliveryNotes: service.deliveryNotes || '',
            partialDeliveryNotes: service.partialDeliveryNotes || '',
            notes: service.notes || '',
            isActive: service.isActive !== false,
            createdAt
          }
        });
        
        // Map localStorage ID to database ID
        idMap[service.id] = createdService.id;
        count++;
      }
      
      return { count, idMap };
    } catch (error) {
      console.error('Error migrating services:', error);
      throw error;
    }
  }
  
  /**
   * Migrate bag labels from localStorage to PostgreSQL
   * @param {Object} hotelIdMap - Hotel ID mapping from localStorage to database
   * @param {Object} serviceIdMap - Service ID mapping from localStorage to database
   * @returns {Promise<Object>} Migration results with ID mapping
   */
  async migrateBagLabels(hotelIdMap, serviceIdMap) {
    try {
      // Get bag labels from localStorage
      const bagLabels = storage.getItem('bagLabels') || [];
      
      if (!bagLabels.length) {
        return { count: 0, idMap: {} };
      }
      
      // ID mapping from localStorage to database
      const idMap = {};
      let count = 0;
      
      // Migrate each bag label
      for (const label of bagLabels) {
        // Skip labels with missing required data
        if (!label.hotelId || !hotelIdMap[label.hotelId] || !label.labelNumber) {
          continue;
        }
        
        // Check if label already exists (by label number)
        const existingLabel = await prisma.bagLabel.findFirst({
          where: { labelNumber: label.labelNumber }
        });
        
        if (existingLabel) {
          idMap[label.id] = existingLabel.id;
          continue;
        }
        
        // Create bag label in database
        const createdLabel = await prisma.bagLabel.create({
          data: {
            hotelId: hotelIdMap[label.hotelId],
            serviceId: label.serviceId && serviceIdMap[label.serviceId] ? serviceIdMap[label.serviceId] : null,
            labelNumber: label.labelNumber,
            status: label.status || 'AVAILABLE',
            notes: label.notes || '',
            createdAt: label.createdAt ? new Date(label.createdAt) : new Date()
          }
        });
        
        // Map localStorage ID to database ID
        idMap[label.id] = createdLabel.id;
        count++;
      }
      
      return { count, idMap };
    } catch (error) {
      console.error('Error migrating bag labels:', error);
      throw error;
    }
  }
  
  /**
   * Migrate transactions from localStorage to PostgreSQL
   * @param {Object} hotelIdMap - Hotel ID mapping from localStorage to database
   * @param {Object} serviceIdMap - Service ID mapping from localStorage to database
   * @returns {Promise<Object>} Migration results with ID mapping
   */
  async migrateTransactions(hotelIdMap, serviceIdMap) {
    try {
      // Get transactions from localStorage
      const transactions = storage.getItem('transactions') || [];
      
      if (!transactions.length) {
        return { count: 0, idMap: {} };
      }
      
      // ID mapping from localStorage to database
      const idMap = {};
      let count = 0;
      
      // Get admin user ID for attribution
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });
      
      const createdById = admin ? admin.id : null;
      
      // Migrate each transaction
      for (const transaction of transactions) {
        // Skip transactions with missing required data
        if (!transaction.hotelId || !hotelIdMap[transaction.hotelId] || !transaction.amount) {
          continue;
        }
        
        // Check if transaction already exists (by unique identifiers)
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            hotelId: hotelIdMap[transaction.hotelId],
            serviceId: transaction.serviceId && serviceIdMap[transaction.serviceId] ? serviceIdMap[transaction.serviceId] : null,
            amount: parseFloat(transaction.amount),
            type: transaction.type,
            createdAt: transaction.createdAt ? new Date(transaction.createdAt) : undefined
          }
        });
        
        if (existingTransaction) {
          idMap[transaction.id] = existingTransaction.id;
          continue;
        }
        
        // Calculate tax and subtotal
        const amount = parseFloat(transaction.amount) || 0;
        const subtotal = transaction.type === 'EXPENSE' ? amount : amount / 1.16; // Assuming 16% tax
        const tax = transaction.type === 'EXPENSE' ? 0 : amount - subtotal;
        
        // Create transaction in database
        const createdTransaction = await prisma.transaction.create({
          data: {
            hotelId: hotelIdMap[transaction.hotelId],
            serviceId: transaction.serviceId && serviceIdMap[transaction.serviceId] ? serviceIdMap[transaction.serviceId] : null,
            type: transaction.type || 'PAYMENT',
            amount,
            subtotal,
            tax,
            paymentMethod: transaction.paymentMethod || 'CASH',
            notes: transaction.notes || '',
            receiptNumber: transaction.receiptNumber || null,
            status: transaction.status || 'COMPLETED',
            createdById,
            createdAt: transaction.createdAt ? new Date(transaction.createdAt) : new Date()
          }
        });
        
        // Map localStorage ID to database ID
        idMap[transaction.id] = createdTransaction.id;
        count++;
      }
      
      return { count, idMap };
    } catch (error) {
      console.error('Error migrating transactions:', error);
      throw error;
    }
  }
  
  /**
   * Clear localStorage after migration
   */
  clearLocalStorage() {
    try {
      storage.removeItem('hotels');
      storage.removeItem('guests');
      storage.removeItem('services');
      storage.removeItem('bagLabels');
      storage.removeItem('transactions');
      
      // Keep user data
      storage.setItem('migrationCompleted', true);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      throw error;
    }
  }
}

export default new MigrationUtil();