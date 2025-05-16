import api from './axiosConfig';

export interface Holiday {
  id: number;
  date: string;
  name: string;
  note?: string;
  created_at?: string;
}

export interface CreateHolidayRequest {
  date: string;
  name: string;
  note?: string;
}

const holidayService = {
  // Get all holidays
  getAllHolidays: async (): Promise<Holiday[]> => {
    const response = await api.get('/api/holidays');
    return response.data;
  },

  // Get holiday by ID
  getHolidayById: async (id: number): Promise<Holiday> => {
    const response = await api.get(`/api/holidays/${id}`);
    return response.data;
  },

  // Create new holiday
  createHoliday: async (holidayData: CreateHolidayRequest): Promise<Holiday> => {
    const response = await api.post('/api/holidays', holidayData);
    return response.data;
  },

  // Update holiday
  updateHoliday: async (id: number, holidayData: Partial<Holiday>): Promise<Holiday> => {
    const response = await api.put(`/api/holidays/${id}`, holidayData);
    return response.data;
  },

  // Delete holiday
  deleteHoliday: async (id: number): Promise<void> => {
    try {
      console.log(`Deleting holiday ${id}`);
      await api.delete(`/api/holidays/${id}`);
    } catch (error) {
      console.error(`Error deleting holiday ${id}:`, error);
      throw error;
    }
  },
};

export default holidayService; 