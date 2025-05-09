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
    try {
      console.log('Fetching holidays...');
      const response = await api.get('/holidays');
      console.log('Holidays response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching holidays:', error);
      throw error;
    }
  },

  // Get holiday by ID
  getHolidayById: async (id: number): Promise<Holiday> => {
    try {
      const response = await api.get(`/holidays/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching holiday ${id}:`, error);
      throw error;
    }
  },

  // Create new holiday
  createHoliday: async (holidayData: CreateHolidayRequest): Promise<Holiday> => {
    try {
      console.log('API createHoliday called with:', holidayData);
      const response = await api.post('/holidays', holidayData);
      console.log('API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API error details:', error);
      throw error;
    }
  },

  // Update holiday
  updateHoliday: async (id: number, holidayData: Partial<Holiday>): Promise<Holiday> => {
    try {
      console.log(`Updating holiday ${id} with:`, holidayData);
      const response = await api.put(`/holidays/${id}`, holidayData);
      return response.data;
    } catch (error) {
      console.error(`Error updating holiday ${id}:`, error);
      throw error;
    }
  },

  // Delete holiday
  deleteHoliday: async (id: number): Promise<void> => {
    try {
      console.log(`Deleting holiday ${id}`);
      await api.delete(`/holidays/${id}`);
    } catch (error) {
      console.error(`Error deleting holiday ${id}:`, error);
      throw error;
    }
  },
};

export default holidayService; 