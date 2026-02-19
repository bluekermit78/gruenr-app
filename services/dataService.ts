static async deleteSuggestion(id: string): Promise<boolean> {
    if (isBackendConfigured()) {
      const { data } = await supabase!.from('suggestions').select('images').eq('id', id).single();
      if (data?.images) await this.deleteImagesFromStorage(data.images);
      const { error } = await supabase!.from('suggestions').delete().eq('id', id);
      if (error) {
        console.error("Error deleting suggestion:", error);
        return false;
      }
      return true; // Wichtig: Rückgabe für das UI
    }
    return false;
  }

  static async deleteReport(id: string): Promise<boolean> {
    if (isBackendConfigured()) {
      const { data } = await supabase!.from('reports').select('images').eq('id', id).single();
      if (data?.images) await this.deleteImagesFromStorage(data.images);
      const { error } = await supabase!.from('reports').delete().eq('id', id);
      if (error) {
        console.error("Error deleting report:", error);
        return false;
      }
      return true;
    }
    return false;
  }

  static async deleteHighlight(id: string): Promise<boolean> {
    if (isBackendConfigured()) {
      const { data } = await supabase!.from('highlights').select('images').eq('id', id).single();
      if (data?.images) await this.deleteImagesFromStorage(data.images);
      const { error } = await supabase!.from('highlights').delete().eq('id', id);
      if (error) {
        console.error("Error deleting highlight:", error);
        return false;
      }
      return true;
    }
    return false;
  }
