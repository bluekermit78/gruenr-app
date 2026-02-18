import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  TreePine, Map as MapIcon, List as ListIcon, PlusCircle, ThumbsUp, ThumbsDown, Navigation, 
  Info, ChevronRight, Loader2, X, User as UserIcon, LogOut, LogIn, Mail, Calendar, Award, 
  Camera, Trash2, CheckCircle2, MessageSquare, ShieldCheck, ShieldAlert, Users, AlertTriangle, 
  Clock, CheckSquare, MessageCircle, Key, Save, Edit2, Leaf, Building2, Star, ChevronLeft, 
  MapPinOff, CloudOff, Cloud as CloudCheck, Image as ImageIcon, MoreHorizontal, Lock 
} from 'lucide-react';
import { TreeSuggestion, TreeSuggestionStatus, ViewMode, User, UserRole, Comment, DamageReport, DamageReportStatus, Highlight } from './types';
import { DataService } from './services/dataService';       
import { AuthService } from './services/authService';
import { supabase } from './services/supabaseClient';

// Leaflet Icons Fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LIPPSTADT_CENTER: [number, number] = [51.6739, 8.3448];
const KREIS_SOEST_BOUNDS = { minLat: 51.3650, maxLat: 51.7450, minLng: 7.8450, maxLng: 8.6050 };

const isWithinSoest = (lat: number, lng: number) => {
  return lat >= KREIS_SOEST_BOUNDS.minLat && lat <= KREIS_SOEST_BOUNDS.maxLat && 
         lng >= KREIS_SOEST_BOUNDS.minLng && lng <= KREIS_SOEST_BOUNDS.maxLng;
};

const compressImage = (base64: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } 
      else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64);
  });
};

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' }).format(new Date(timestamp));
};

const AppImage: React.FC<{ src?: string, alt?: string, className?: string }> = ({ src, alt, className }) => {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [src]);
  if (!src || error) return <div className={`bg-gray-100 flex items-center justify-center text-gray-300 ${className}`}><ImageIcon className="w-8 h-8" /></div>;
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
};

const getTreeIcon = (status: TreeSuggestionStatus, isHighlighted: boolean = false) => {
  let color = '#10b981';
  if (status === 'Gepflanzt') color = '#065f46'; if (status === 'Akzeptiert') color = '#3b82f6';
  if (status === 'In Arbeit') color = '#f59e0b'; if (status === 'Abgelehnt') color = '#ef4444';
  const highlightClass = isHighlighted ? 'animate-marker-pulse scale-125' : '';
  return L.divIcon({
    html: `<div class="${highlightClass}" style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.2)"><div style="transform: rotate(45deg); color: white; font-size: 12px;">${status === 'Gepflanzt' ? '✓' : '🌳'}</div></div>`,
    className: 'custom-tree-marker', iconSize: [28, 28], iconAnchor: [14, 28]
  });
};

const getHighlightIcon = (isHighlighted: boolean = false) => {
  const highlightClass = isHighlighted ? 'animate-marker-pulse scale-125' : '';
  return L.divIcon({
    html: `<div class="${highlightClass}" style="background-color: #fbbf24; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.3)"><div style="color: white; font-size: 16px;">⭐</div></div>`,
    className: 'custom-highlight-marker', iconSize: [32, 32], iconAnchor: [16, 16]
  });
};

const getDamageIcon = (status: DamageReportStatus, isHighlighted: boolean = false) => {
  const color = status === 'Erledigt' ? '#10b981' : status === 'In Arbeit' ? '#f59e0b' : '#ef4444';
  const highlightClass = isHighlighted ? 'animate-marker-pulse scale-125' : '';
  return L.divIcon({
    html: `<div class="${highlightClass}" style="background-color: ${color}; width: 28px; height: 28px; border-radius: 4px; transform: rotate(45deg); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.2)"><div style="transform: rotate(-45deg); color: white; font-size: 12px;">⚠️</div></div>`,
    className: 'custom-damage-marker', iconSize: [28, 28], iconAnchor: [14, 28]
  });
};

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [suggestions, setSuggestions] = useState<TreeSuggestion[]>([]);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'cloud'>('cloud');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Auth State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Edit Comment State
  const [editingComment, setEditingComment] = useState<{ id: string, text: string, parentId: string, type: 'suggestion' | 'report' } | null>(null);

  // --- NEUE FETCH LOGIK MIT TIMEOUT ---
  const fetchData = async () => {
    // Ein "Timer", der nach 5 Sekunden "Alarm" schlägt (reject)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 5000)
    );

    // Die eigentliche Datenabfrage
    const dataPromise = Promise.all([
      DataService.fetchUsers(),
      DataService.fetchSuggestions(),
      DataService.fetchReports(),
      DataService.fetchHighlights(),
    ]);

    try {
      // Promise.race nimmt das Ergebnis, das ZUERST fertig ist.
      // Entweder die Daten kommen schnell (< 5s) -> Success
      // Oder der Timer läuft ab (5s) -> Error/Catch
      const result = await Promise.race([dataPromise, timeoutPromise]);
      
      // Wenn wir hier sind, waren die Daten schneller als der Timer
      const [u, s, r, h] = result as [User[], TreeSuggestion[], DamageReport[], Highlight[]];
      setUsers(u); setSuggestions(s); setReports(r); setHighlights(h);

    } catch (e) {
      console.error("Laden abgebrochen (Timeout oder Fehler):", e);
      // Im Fehlerfall (oder bei Timeout) beenden wir das Laden trotzdem,
      // damit der Nutzer nicht vor einem weißen Bildschirm sitzt.
      showNotification('Verbindung langsam - Daten evtl. unvollständig.', 'error');
    } finally {
      // Egal was passiert: Ladebildschirm wegnehmen!
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const { data: authListener } = supabase!.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data: userProfile } = await supabase!.from('users').select('*').eq('id', session.user.id).single();
        if (userProfile) {
          setCurrentUser(userProfile as User);
        }
        setSyncStatus('cloud');
      } else {
        setCurrentUser(null);
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<{name: string, email: string, role: UserRole, organization: string}>({name: '', email: '', role: 'user', organization: ''});

  const [isAdding, setIsAdding] = useState<'suggestion' | 'damage' | 'highlight' | null>(null);
  const [newLocation, setNewLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isCompresing, setIsCompressing] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(LIPPSTADT_CENTER);
  
  // Gemeinsames State für Kommentar-Eingaben
  const [commentText, setCommentText] = useState<{ [id: string]: string }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MapController = ({ onCenterChange }: { onCenterChange: (center: [number, number]) => void }) => {
    const map = useMap();
    useEffect(() => { const timer = setTimeout(() => { map.invalidateSize(); }, 100); return () => clearTimeout(timer); }, [map]);
    useMapEvents({
      click(e) {
        if (isAdding && currentUser) {
          const { lat, lng } = e.latlng;
          if (isWithinSoest(lat, lng)) { setNewLocation({ lat, lng }); setLocationError(null); } 
          else { setNewLocation(null); setLocationError('Dieser Standort liegt außerhalb des Kreises Soest.'); }
        }
        setHighlightedId(null);
      },
      popupclose() { setHighlightedId(null); },
      moveend(e) { onCenterChange([e.target.getCenter().lat, e.target.getCenter().lng]); }
    });
    return null;
  };

  const navigateToMap = (id: string, lat: number, lng: number) => { setMapCenter([lat, lng]); setHighlightedId(id); setViewMode('map'); };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    if (authMode === 'register') {
      const { error } = await AuthService.signUp(authEmail, authPassword, authName);
      if (error) { showNotification(error.message, 'error'); } 
      else { showNotification('Registrierung erfolgreich! Bitte prüfe deine E-Mails.', 'success'); setShowAuthModal(false); }
    } else {
      const { error } = await AuthService.signIn(authEmail, authPassword);
      if (error) { showNotification('Login fehlgeschlagen. Prüfe deine Daten.', 'error'); } 
      else { showNotification('Willkommen zurück!', 'success'); setShowAuthModal(false); }
    }
    setIsAuthLoading(false);
  };

  const handleLogout = async () => { 
    await AuthService.signOut(); setViewMode('map'); setIsAdding(null); showNotification('Abgemeldet.');
  };

  const handleEditUser = (user: User) => { setEditingUserId(user.id); setEditUserForm({ name: user.name, email: user.email, role: user.role, organization: user.organization || '' }); };

  const handleSaveUserEdit = async () => {
    if (!editingUserId) return;
    const updatedUser = { ...users.find(u => u.id === editingUserId)!, ...editUserForm };
    await DataService.saveUser(updatedUser); 
    setUsers(prev => prev.map(u => u.id === editingUserId ? updatedUser : u));
    setEditingUserId(null); showNotification('Nutzerdaten aktualisiert.');
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) { alert("Du kannst dich nicht selbst löschen!"); return; }
    if (confirm(`Möchtest du diesen Benutzer wirklich unwiderruflich löschen?`)) {
      await DataService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId)); showNotification('Benutzer wurde gelöscht.');
    }
  };

  const handleCancelAdding = () => { setIsAdding(null); setNewLocation(null); setLocationError(null); setFormData({ title: '', description: '' }); setSelectedImages([]); };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Vorschlag': return 'bg-gray-100 text-gray-700'; case 'Akzeptiert': return 'bg-blue-100 text-blue-700';
      case 'In Arbeit': return 'bg-amber-100 text-amber-700'; case 'Gepflanzt': return 'bg-emerald-100 text-emerald-700';
      case 'Abgelehnt': return 'bg-red-100 text-red-700'; case 'Gemeldet': return 'bg-red-100 text-red-700';
      case 'Erledigt': return 'bg-emerald-100 text-emerald-700'; default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return; setIsCompressing(true);
    const remaining = 5 - selectedImages.length; const filesToProcess = Array.from(files).slice(0, remaining) as File[];
    for (const file of filesToProcess) {
      const base64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(file); });
      const compressed = await compressImage(base64); setSelectedImages(prev => [...prev, compressed]);
    }
    setIsCompressing(false);
  };

  const deleteReport = async (id: string) => {
    if(confirm('Möchtest du diese Meldung wirklich löschen?')) {
      await DataService.deleteReport(id); setReports(prev => prev.filter(r => r.id !== id)); showNotification('Meldung gelöscht.');
    }
  };

  const deleteHighlight = async (id: string) => {
    if(confirm('Highlight löschen?')) {
      await DataService.deleteHighlight(id); setHighlights(prev => prev.filter(h => h.id !== id)); showNotification('Highlight entfernt.');
    }
  };

  const updateReportStatus = async (id: string, status: DamageReportStatus) => {
    const report = reports.find(r => r.id === id); if(!report) return;
    const updated = { ...report, status };
    await DataService.updateReport(updated); 
    setReports(prev => prev.map(r => r.id === id ? updated : r)); showNotification(`Status auf "${status}" gesetzt.`);
  };

  const handleVote = async (id: string, type: 'up' | 'down') => {
    if (!currentUser) { setShowAuthModal(true); return; }
    const suggestion = suggestions.find(s => s.id === id); if(!suggestion) return;
    const uid = currentUser.id;
    let nextUp = [...suggestion.upVotedBy]; let nextDown = [...suggestion.downVotedBy];
    if (type === 'up') { if (nextUp.includes(uid)) nextUp = nextUp.filter(id => id !== uid); else { nextUp.push(uid); nextDown = nextDown.filter(id => id !== uid); } } 
    else { if (nextDown.includes(uid)) nextDown = nextDown.filter(id => id !== uid); else { nextDown.push(uid); nextUp = nextUp.filter(id => id !== uid); } }
    const updated = { ...suggestion, upVotedBy: nextUp, downVotedBy: nextDown, votes: nextUp.length - nextDown.length };
    await DataService.updateSuggestion(updated); 
    setSuggestions(prev => prev.map(s => s.id === id ? updated : s));
  };

  const updateSuggestionStatus = async (id: string, status: TreeSuggestionStatus) => {
    const suggestion = suggestions.find(s => s.id === id); if(!suggestion) return;
    const updated = { ...suggestion, status };
    await DataService.updateSuggestion(updated); 
    setSuggestions(prev => prev.map(s => s.id === id ? updated : s)); showNotification(`Status geändert zu: ${status}`);
  };

  const deleteSuggestion = async (id: string) => {
    if (confirm('Diesen Vorschlag wirklich löschen?')) {
      await DataService.deleteSuggestion(id); 
      setSuggestions(prev => prev.filter(s => s.id !== id)); showNotification('Vorschlag gelöscht.');
    }
  };

  // --- KOMMENTAR LOGIK (GENERIC) ---
  const addGenericComment = async (parentId: string, type: 'suggestion' | 'report') => {
    const text = commentText[parentId]; if (!text?.trim() || !currentUser) return;
    
    const newComment: Comment = { 
      id: Math.random().toString(36).substr(2, 9), 
      authorId: currentUser.id, 
      authorName: currentUser.name, 
      authorRole: currentUser.role, 
      authorOrg: currentUser.organization, 
      text: text.trim(), 
      createdAt: Date.now() 
    };

    if (type === 'suggestion') {
      const parent = suggestions.find(s => s.id === parentId); if(!parent) return;
      const updated = { ...parent, comments: [...parent.comments, newComment] };
      await DataService.updateSuggestion(updated);
      setSuggestions(prev => prev.map(s => s.id === parentId ? updated : s));
    } else {
      const parent = reports.find(r => r.id === parentId); if(!parent) return;
      const updated = { ...parent, comments: [...parent.comments, newComment] };
      await DataService.updateReport(updated);
      setReports(prev => prev.map(r => r.id === parentId ? updated : r));
    }
    
    setCommentText(prev => ({ ...prev, [parentId]: '' })); 
    showNotification('Kommentar hinzugefügt.');
  };

  const startEditComment = (comment: Comment, parentId: string, type: 'suggestion' | 'report') => {
    setEditingComment({ id: comment.id, text: comment.text, parentId, type });
  };

  const saveEditedComment = async () => {
    if (!editingComment || !editingComment.text.trim()) return;
    
    const { id, text, parentId, type } = editingComment;
    
    if (type === 'suggestion') {
      const parent = suggestions.find(s => s.id === parentId); if(!parent) return;
      const updatedComments = parent.comments.map(c => c.id === id ? { ...c, text: text, updatedAt: Date.now() } : c);
      const updated = { ...parent, comments: updatedComments };
      await DataService.updateSuggestion(updated);
      setSuggestions(prev => prev.map(s => s.id === parentId ? updated : s));
    } else {
      const parent = reports.find(r => r.id === parentId); if(!parent) return;
      const updatedComments = parent.comments.map(c => c.id === id ? { ...c, text: text, updatedAt: Date.now() } : c);
      const updated = { ...parent, comments: updatedComments };
      await DataService.updateReport(updated);
      setReports(prev => prev.map(r => r.id === parentId ? updated : r));
    }
    setEditingComment(null);
    showNotification('Kommentar aktualisiert.');
  };

  // --- SAVE ENTRY: JETZT MIT STORAGE UPLOAD ---
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newLocation || !formData.title || !formData.description || isCompresing) return;

    try {
        // 1. Bilder hochladen (falls vorhanden)
        const uploadedImageUrls: string[] = [];
        
        if (selectedImages.length > 0) {
            showNotification('Bilder werden hochgeladen...', 'success');
            
            for (const imgBase64 of selectedImages) {
                // Hier wird der neue Storage-Upload genutzt
                const url = await DataService.uploadImage(imgBase64);
                if (url) {
                    uploadedImageUrls.push(url);
                } else {
                    console.error("Bild konnte nicht hochgeladen werden.");
                }
            }
        }

        const newId = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();

        if (isAdding === 'suggestion') {
            const newEntry: TreeSuggestion = {
                id: newId,
                lat: newLocation.lat,
                lng: newLocation.lng,
                title: formData.title,
                description: formData.description,
                images: uploadedImageUrls, // URLs statt Base64
                votes: 1,
                upVotedBy: [currentUser.id],
                downVotedBy: [],
                comments: [],
                authorId: currentUser.id,
                authorName: currentUser.name,
                createdAt: timestamp,
                status: 'Vorschlag'
            };
            await DataService.addSuggestion(newEntry);
            setSuggestions([newEntry, ...suggestions]);
            setViewMode('list');
            showNotification('Vorschlag erfolgreich erstellt!');

        } else if (isAdding === 'damage') {
            const newEntry: DamageReport = {
                id: newId,
                lat: newLocation.lat,
                lng: newLocation.lng,
                title: formData.title,
                description: formData.description,
                images: uploadedImageUrls, // URLs statt Base64
                status: 'Gemeldet',
                authorId: currentUser.id,
                authorName: currentUser.name,
                createdAt: timestamp,
                comments: []
            };
            await DataService.addReport(newEntry);
            setReports([newEntry, ...reports]);
            setViewMode('reports');
            showNotification('Schaden gemeldet. Danke!');

        } else if (isAdding === 'highlight') {
            const newEntry: Highlight = {
                id: newId,
                lat: newLocation.lat,
                lng: newLocation.lng,
                title: formData.title,
                description: formData.description,
                images: uploadedImageUrls, // URLs statt Base64
                authorId: currentUser.id,
                createdAt: timestamp
            };
            await DataService.addHighlight(newEntry);
            setHighlights([newEntry, ...highlights]);
            setViewMode('highlights');
            showNotification('Highlight erstellt!');
        }

        // Reset
        setIsAdding(null);
        setNewLocation(null);
        setFormData({ title: '', description: '' });
        setSelectedImages([]);

    } catch (error) {
        console.error("Fehler beim Speichern:", error);
        showNotification('Fehler beim Speichern des Eintrags.', 'error');
    }
  };

  // Helper zum Rendern der Kommentare
  const renderCommentsSection = (comments: Comment[], parentId: string, type: 'suggestion' | 'report') => {
    return (
      <div className="mt-4 border-t border-gray-100 pt-4">
        {comments.length > 0 && (
          <div className="mb-4 space-y-3">
            {comments.map(c => (
              <div key={c.id} className={`p-3 rounded-xl text-sm ${c.authorRole === 'admin' || c.authorRole === 'moderator' ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50'}`}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${c.authorRole === 'admin' || c.authorRole === 'moderator' ? 'text-emerald-800' : 'text-gray-700'}`}>{c.authorName}</span>
                    {(c.authorRole === 'admin' || c.authorRole === 'moderator') && (
                      <span className="text-[10px] uppercase tracking-wider bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">{c.authorOrg || c.authorRole}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatDate(c.createdAt)}</span>
                    {currentUser && currentUser.id === c.authorId && (
                      <button onClick={() => startEditComment(c, parentId, type)} className="text-gray-400 hover:text-emerald-600">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {editingComment && editingComment.id === c.id ? (
                  <div className="flex gap-2 mt-2">
                    <input autoFocus className="flex-1 p-2 text-sm border rounded-lg" value={editingComment.text} onChange={(e) => setEditingComment({...editingComment, text: e.target.value})} />
                    <button onClick={saveEditedComment} className="bg-emerald-600 text-white px-3 rounded-lg text-xs font-bold">Save</button>
                    <button onClick={() => setEditingComment(null)} className="text-gray-400 px-2"><X className="w-4 h-4"/></button>
                  </div>
                ) : (
                  <p className="text-gray-700">{c.text} {c.updatedAt && <span className="text-[10px] text-gray-400 italic">(bearbeitet)</span>}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {currentUser && (
          <div className="flex gap-2">
            <input 
              className="flex-1 p-2 rounded-xl border text-sm outline-none focus:border-emerald-500" 
              placeholder="Deine Meinung..." 
              value={commentText[parentId] || ''} 
              onChange={e => setCommentText({...commentText, [parentId]: e.target.value})} 
              onKeyDown={e => e.key === 'Enter' && addGenericComment(parentId, type)}
            />
            <button onClick={() => addGenericComment(parentId, type)} className="bg-emerald-800 text-white px-4 rounded-xl text-xs font-bold hover:bg-emerald-900">Senden</button>
          </div>
        )}
      </div>
    );
  };

  const isModOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const isAdmin = currentUser?.role === 'admin';

  if (isLoading) {
    return <div className="h-screen w-full flex flex-col items-center justify-center bg-emerald-900 text-white"><Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-4" /><p className="font-bold text-lg animate-pulse">grünr wird geladen...</p></div>;
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-white relative">
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 ${notification.type === 'success' ? 'bg-emerald-800 text-white' : 'bg-red-600 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}
      
      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-emerald-900 p-8 text-center text-white relative">
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 hover:bg-emerald-800 rounded-full p-1"><X /></button>
              <div className="bg-white/10 w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4"><Leaf className="w-12 h-12 text-emerald-400" /></div>
              <h2 className="text-3xl font-bold brand-text">grünr</h2>
              <p className="opacity-80 text-sm mt-2 font-medium">Lippstädter Grün e.V.</p>
            </div>
            
            <div className="p-8">
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${authMode === 'login' ? 'bg-white shadow-sm text-emerald-800' : 'text-gray-500 hover:text-gray-700'}`}>Anmelden</button>
                <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${authMode === 'register' ? 'bg-white shadow-sm text-emerald-800' : 'text-gray-500 hover:text-gray-700'}`}>Registrieren</button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Name</label>
                    <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" required placeholder="Dein Name" className="w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-600 outline-none transition" value={authName} onChange={e => setAuthName(e.target.value)}/></div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">E-Mail</label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" required placeholder="name@beispiel.de" className="w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-600 outline-none transition" value={authEmail} onChange={e => setAuthEmail(e.target.value)}/></div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Passwort</label>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" required placeholder="••••••••" className="w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-600 outline-none transition" value={authPassword} onChange={e => setAuthPassword(e.target.value)}/></div>
                </div>

                <button disabled={isAuthLoading} type="submit" className="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold hover:bg-emerald-800 transition shadow-lg flex items-center justify-center gap-2">
                  {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : (authMode === 'login' ? 'Einloggen' : 'Konto erstellen')}
                </button>
              </form>
              
              {authMode === 'register' && <p className="text-xs text-center text-gray-400 mt-4">Wir senden dir einen Bestätigungslink per E-Mail.</p>}

              {/* NEUER BEREICH: IMPRESSUM & DATENSCHUTZ */}
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
                <a href="https://lippstaedter-gruen.de/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-800 hover:underline transition">Impressum</a>
                <span className="opacity-50">•</span>
                <a href="https://lippstaedter-gruen.de/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-800 hover:underline transition">Datenschutz</a>
              </div>

            </div>
          </div>
        </div>
      )}

      <header className="bg-emerald-900 text-white p-4 shadow-lg z-50 flex justify-between items-center border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewMode('map')}><div className="bg-white/10 p-1.5 rounded-lg"><Leaf className="w-6 h-6 text-emerald-400" /></div><div className="flex flex-col"><h1 className="text-xl font-black brand-text leading-none">grünr</h1><div className="flex items-center gap-1.5"><span className="text-[8px] font-bold tracking-widest opacity-60">Lippstädter Grün e.V.</span><div className="flex items-center gap-0.5 opacity-40 hover:opacity-100 transition cursor-help" title={syncStatus === 'syncing' ? 'Synchronisiere...' : 'Daten in Cloud gespeichert'}>{syncStatus === 'syncing' ? <Loader2 className="w-2 h-2 animate-spin" /> : <CloudCheck className="w-2 h-2" />}</div></div></div></div>
        <div className="flex gap-2 items-center"><button onClick={() => setViewMode('map')} className={`p-2 rounded-xl transition ${viewMode === 'map' ? 'bg-white/20' : 'hover:bg-white/10'}`}><MapIcon className="w-5 h-5" /></button><button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition ${viewMode === 'list' ? 'bg-white/20' : 'hover:bg-white/10'}`}><ListIcon className="w-5 h-5" /></button><button onClick={() => setViewMode('highlights')} className={`p-2 rounded-xl transition ${viewMode === 'highlights' ? 'bg-white/20' : 'hover:bg-white/10'}`}><Star className="w-5 h-5" /></button><button onClick={() => setViewMode('reports')} className={`p-2 rounded-xl transition ${viewMode === 'reports' ? 'bg-white/20' : 'hover:bg-white/10'}`}><AlertTriangle className="w-5 h-5" /></button><div className="w-px h-6 bg-white/20 mx-1" />{currentUser ? (<button onClick={() => setViewMode('profile')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition ${viewMode === 'profile' ? 'bg-white/20' : 'hover:bg-white/10'}`}><div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-900 font-bold text-xs uppercase">{currentUser.name.charAt(0)}</div><span className="text-sm font-semibold hidden md:block">{currentUser.name}</span></button>) : (<button onClick={() => setShowAuthModal(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-400"><LogIn className="w-4 h-4" /> Login</button>)}</div>
      </header>
      <main className="flex-1 relative overflow-hidden bg-gray-100">
        {viewMode === 'map' && (
          <div className="w-full h-full relative z-0">
            {/* @ts-ignore */}
            <MapContainer center={mapCenter} zoom={13} className="h-full w-full z-0" style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapController onCenterChange={setMapCenter} />
              {suggestions.map((s) => (
                // @ts-ignore
                <Marker key={s.id} position={[s.lat, s.lng]} icon={getTreeIcon(s.status, highlightedId === s.id)} eventHandlers={{ click: () => setHighlightedId(s.id) }}>
                  <Popup minWidth={240}><div className="p-1">{s.images && s.images[0] && <AppImage src={s.images[0]} className="w-full h-24 object-cover rounded-lg mb-2" />}<h3 className="font-bold text-emerald-900">{s.title}</h3><button onClick={() => setViewMode('list')} className="text-emerald-700 text-xs font-bold underline">Details</button></div></Popup>
                </Marker>
              ))}
              {highlights.map((h) => (
                // @ts-ignore
                <Marker key={h.id} position={[h.lat, h.lng]} icon={getHighlightIcon(highlightedId === h.id)} eventHandlers={{ click: () => setHighlightedId(h.id) }}>
                  <Popup minWidth={240}><div className="p-1">{h.images && h.images[0] && <AppImage src={h.images[0]} className="w-full h-24 object-cover rounded-lg mb-2" />}<h3 className="font-bold">{h.title}</h3><button onClick={() => setViewMode('highlights')} className="text-amber-600 text-xs font-bold underline">Details</button></div></Popup>
                </Marker>
              ))}
              {reports.map((r) => (
                // @ts-ignore
                <Marker key={r.id} position={[r.lat, r.lng]} icon={getDamageIcon(r.status, highlightedId === r.id)} eventHandlers={{ click: () => setHighlightedId(r.id) }}>
                  <Popup minWidth={240}><div className="p-1">{r.images && r.images[0] && <AppImage src={r.images[0]} className="w-full h-24 object-cover rounded-lg mb-2" />}<h3 className="font-bold">{r.title}</h3><button onClick={() => setViewMode('reports')} className="text-red-600 text-xs font-bold underline">Details</button></div></Popup>
                </Marker>
              ))}
              {newLocation && (<Marker position={[newLocation.lat, newLocation.lng]} icon={L.divIcon({ html: `<div class="w-8 h-8 ${isAdding === 'suggestion' ? 'bg-emerald-500' : isAdding === 'damage' ? 'bg-red-500' : 'bg-amber-500'} rounded-full border-4 border-white shadow-lg animate-pulse"></div>`, className: 'new-loc-marker', iconSize: [32, 32], iconAnchor: [16, 16] })} />)}
            </MapContainer>
            {!isAdding && (
              <div className="absolute bottom-10 right-6 z-[1000] flex flex-col gap-3">
                {isModOrAdmin && (<button onClick={() => setIsAdding('highlight')} className="flex items-center gap-3 bg-amber-500 text-white px-6 py-4 rounded-2xl shadow-2xl hover:bg-amber-600 transition transform hover:-translate-y-1 active:scale-95"><Star className="w-5 h-5 fill-white" /> <span className="font-bold uppercase tracking-widest text-sm">Highlight</span></button>)}
                <button onClick={() => currentUser ? setIsAdding('suggestion') : setShowAuthModal(true)} className="flex items-center gap-3 bg-emerald-700 text-white px-6 py-4 rounded-2xl shadow-2xl hover:bg-emerald-800 transition transform hover:-translate-y-1 active:scale-95"><PlusCircle className="w-5 h-5" /> <span className="font-bold uppercase tracking-widest text-sm">Vorschlag</span></button>
                <button onClick={() => currentUser ? setIsAdding('damage') : setShowAuthModal(true)} className="flex items-center gap-3 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl hover:bg-red-700 transition transform hover:-translate-y-1 active:scale-95"><AlertTriangle className="w-5 h-5" /> <span className="font-bold uppercase tracking-widest text-sm">Schaden</span></button>
              </div>
            )}
            {isAdding && (
              <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-white p-6 rounded-3xl shadow-2xl w-[90%] max-w-md animate-in slide-in-from-top-4 border-2 ${isAdding === 'suggestion' ? 'border-emerald-500' : isAdding === 'damage' ? 'border-red-500' : 'border-amber-500'}`}>
                {!newLocation ? (<div className="text-center py-4 space-y-4"><div className={`${isAdding === 'suggestion' ? 'bg-emerald-100 text-emerald-600' : isAdding === 'damage' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-red-600'} w-16 h-16 rounded-full flex items-center justify-center mx-auto animate-bounce`}><Navigation className="w-8 h-8" /></div><div><h3 className="text-xl font-bold text-gray-900">Position wählen</h3><p className="text-gray-600 mt-2">Klicke auf die Karte.</p></div><button onClick={handleCancelAdding} className="text-red-500 font-bold hover:underline flex items-center gap-2 mx-auto"><X className="w-4 h-4" /> Abbrechen</button></div>) : (<div className="space-y-4"><div className="flex justify-between items-center mb-2"><h3 className="font-bold text-xl">Neuer Eintrag</h3><button onClick={handleCancelAdding} className="text-gray-400"><X /></button></div><form onSubmit={handleSaveEntry} className="space-y-4"><input required placeholder="Titel" className="w-full p-3 rounded-xl border outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /><textarea required placeholder="Beschreibung" className="w-full p-3 rounded-xl border outline-none" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /><div className="flex gap-2 flex-wrap">{selectedImages.map((img, i) => <img key={i} src={img} className="w-12 h-12 rounded-lg object-cover border" />)}{selectedImages.length < 5 && <button type="button" disabled={isCompresing} onClick={() => fileInputRef.current?.click()} className="w-12 h-12 border-2 border-dashed rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-600">{isCompresing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera />}</button>}</div><input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleImageChange} /><button disabled={isCompresing} className={`w-full ${isAdding === 'suggestion' ? 'bg-emerald-700' : isAdding === 'damage' ? 'bg-red-600' : 'bg-amber-600'} text-white py-4 rounded-xl font-bold`}>Speichern</button></form></div>)}
              </div>
            )}
          </div>
        )}
        {viewMode === 'highlights' && (<div className="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto space-y-12 pb-32"><h2 className="text-2xl md:text-4xl font-black text-gray-900 brand-text border-b pb-4">Lippstädter Highlights</h2><div className="grid gap-12">{highlights.map(h => (<div key={h.id} className="bg-white rounded-[2.5rem] shadow-sm border border-amber-50 overflow-hidden flex flex-col md:flex-row gap-8 p-6 md:p-8 relative group">{isModOrAdmin && (<button onClick={() => deleteHighlight(h.id)} className="absolute top-6 right-6 p-2 bg-white/80 rounded-full hover:bg-red-100 hover:text-red-600 transition opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5"/></button>)}<div className="w-full md:w-1/2">{h.images?.[0] ? <AppImage src={h.images[0]} className="w-full h-64 object-cover rounded-2xl" /> : <div className="w-full h-64 bg-amber-50 flex items-center justify-center text-amber-200"><Star className="w-20 h-20" /></div>}</div><div className="w-full md:w-1/2 flex flex-col justify-between"><div><h3 className="text-2xl font-bold text-gray-900 mb-4">{h.title}</h3><p className="text-gray-600 leading-relaxed">{h.description}</p></div><div className="flex justify-between items-end mt-8"><span className="text-xs text-gray-400 font-medium">Erstellt am {formatDate(h.createdAt)}</span><button onClick={() => navigateToMap(h.id, h.lat, h.lng)} className="flex items-center gap-2 text-amber-600 font-bold hover:underline">Karte <ChevronRight className="w-4 h-4" /></button></div></div></div>))}</div></div>)}
        {viewMode === 'reports' && (<div className="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-40"><h2 className="text-2xl md:text-3xl font-bold text-red-900 brand-text border-b pb-4">Schadensmeldungen</h2>{reports.map(r => (<div key={r.id} className="bg-white rounded-3xl shadow-sm border border-red-100 p-6 space-y-4"><div className="flex justify-between items-start"><div className="flex items-center gap-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getStatusStyle(r.status)}`}>{r.status}</span><h3 className="text-xl font-bold">{r.title}</h3></div><div className="flex items-center gap-2"><button onClick={() => navigateToMap(r.id, r.lat, r.lng)} className="text-red-600 font-bold text-sm hover:underline">Karte</button>{isModOrAdmin && (<button onClick={() => deleteReport(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>)}</div></div><p className="text-gray-600">{r.description}</p>{r.images?.[0] && <div className="grid grid-cols-2 gap-4"><AppImage src={r.images[0]} className="w-full h-32 object-cover rounded-2xl" /></div>}
        
        {/* Render Comments for Report */}
        {renderCommentsSection(r.comments, r.id, 'report')}

        {isModOrAdmin && (<div className="bg-gray-50 p-4 rounded-xl mt-4 border border-gray-100"><h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Moderation</h4><div className="flex flex-wrap gap-2 mb-4"><button onClick={() => updateReportStatus(r.id, 'Gemeldet')} className={`px-3 py-1 rounded-lg text-xs font-bold border ${r.status === 'Gemeldet' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'}`}>Offen</button><button onClick={() => updateReportStatus(r.id, 'In Arbeit')} className={`px-3 py-1 rounded-lg text-xs font-bold border ${r.status === 'In Arbeit' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200'}`}>In Arbeit</button><button onClick={() => updateReportStatus(r.id, 'Erledigt')} className={`px-3 py-1 rounded-lg text-xs font-bold border ${r.status === 'Erledigt' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}>Erledigt</button></div></div>)}<div className="text-xs text-gray-400 mt-2">Gemeldet von {r.authorName} am {formatDate(r.createdAt)}</div></div>))}</div>)}
        {viewMode === 'list' && (<div className="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-40"><h2 className="text-2xl md:text-3xl font-bold text-emerald-900 brand-text border-b pb-4">Community Vorschläge</h2>{suggestions.map(s => (<div key={s.id} className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 flex flex-col md:flex-row gap-6 relative group">{isModOrAdmin && (<button onClick={() => deleteSuggestion(s.id)} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition"><Trash2 className="w-5 h-5"/></button>)}<div className="flex flex-col items-center justify-center bg-emerald-50 rounded-2xl p-4 min-w-[80px] h-fit"><button onClick={() => handleVote(s.id, 'up')} className={`p-2 rounded-full ${s.upVotedBy.includes(currentUser?.id || '') ? 'text-emerald-700 bg-emerald-200' : 'text-gray-400'}`}><ThumbsUp className="w-6 h-6" /></button><span className="font-bold text-emerald-900 text-lg my-1">{s.votes}</span><button onClick={() => handleVote(s.id, 'down')} className={`p-2 rounded-full ${s.downVotedBy.includes(currentUser?.id || '') ? 'text-red-700 bg-red-100' : 'text-gray-400'}`}><ThumbsDown className="w-6 h-6" /></button></div><div className="flex-1"><div className="flex justify-between pr-8"><div><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getStatusStyle(s.status)}`}>{s.status}</span><h3 className="text-xl font-bold mt-2">{s.title}</h3></div><button onClick={() => navigateToMap(s.id, s.lat, s.lng)} className="text-emerald-700 font-bold hover:underline self-start">Karte</button></div><p className="text-gray-600 mt-2">{s.description}</p>{s.images && s.images.length > 0 && (<div className="flex gap-2 mt-3 overflow-x-auto pb-2">{s.images.map((img, i) => (<AppImage key={i} src={img} className="h-20 w-20 object-cover rounded-lg flex-shrink-0" />))}</div>)}{isModOrAdmin && (<div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100"><div className="text-xs font-bold text-gray-500 uppercase mb-2">Status ändern</div><div className="flex flex-wrap gap-2">{['Vorschlag', 'Akzeptiert', 'In Arbeit', 'Gepflanzt', 'Abgelehnt'].map((st) => (<button key={st} onClick={() => updateSuggestionStatus(s.id, st as TreeSuggestionStatus)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${s.status === st ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{st}</button>))}</div></div>)}
        
        {/* Render Comments for Suggestion */}
        {renderCommentsSection(s.comments, s.id, 'suggestion')}
        
        </div></div>))}</div>)}
        {viewMode === 'profile' && currentUser && (<div className="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-32"><div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-emerald-50"><div className="h-24 bg-emerald-900 flex items-center px-8 text-white relative overflow-hidden"><div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div><h2 className="text-xl font-bold brand-text relative z-10">Dein Profil</h2></div><div className="p-8"><div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"><div className="flex items-center gap-6"><div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-800 text-4xl font-black shadow-inner">{currentUser.name.charAt(0)}</div><div><h3 className="text-3xl font-bold text-gray-900">{currentUser.name}</h3><div className="flex items-center gap-2 mt-1"><span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-widest ${currentUser.role === 'admin' ? 'bg-red-100 text-red-700' : currentUser.role === 'moderator' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{currentUser.role}</span><span className="text-gray-400 text-sm">{currentUser.email}</span></div>{currentUser.organization && <p className="text-sm text-emerald-700 font-medium mt-1"><Building2 className="w-3 h-3 inline mr-1"/> {currentUser.organization}</p>}</div></div><button onClick={handleLogout} className="text-red-600 font-bold px-6 py-3 rounded-2xl border border-red-100 shadow-sm hover:bg-red-50 flex items-center gap-2"><LogOut className="w-4 h-4" /> Abmelden</button></div>{isAdmin && (<div className="mt-12"><h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600"/> Benutzerverwaltung</h3><div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"><table className="w-full text-left"><thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold"><tr><th className="p-4">Name</th><th className="p-4">E-Mail</th><th className="p-4">Rolle</th><th className="p-4">Org.</th><th className="p-4">Aktion</th></tr></thead><tbody className="divide-y divide-gray-100">{users.map(u => (<tr key={u.id} className="hover:bg-gray-50 transition"><td className="p-4">{editingUserId === u.id ? (<input className="border p-1 rounded w-full" value={editUserForm.name} onChange={e => setEditUserForm({...editUserForm, name: e.target.value})} />) : (<div className="font-bold text-gray-900">{u.name}</div>)}</td><td className="p-4">{editingUserId === u.id ? (<input className="border p-1 rounded w-full" value={editUserForm.email} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} />) : (<div className="text-gray-400 text-xs">{u.email}</div>)}</td><td className="p-4">{editingUserId === u.id ? (<select className="border p-1 rounded" value={editUserForm.role} onChange={e => setEditUserForm({...editUserForm, role: e.target.value as UserRole})}><option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select>) : (<span className={`text-xs font-bold uppercase px-2 py-1 rounded-lg ${u.role === 'admin' ? 'bg-red-50 text-red-600' : u.role === 'moderator' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>)}</td><td className="p-4">{editingUserId === u.id ? (<input className="border p-1 rounded w-full" placeholder="-" value={editUserForm.organization} onChange={e => setEditUserForm({...editUserForm, organization: e.target.value})} />) : (<div className="text-gray-600 text-sm">{u.organization || '-'}</div>)}</td><td className="p-4">{editingUserId === u.id ? (<div className="flex gap-2"><button onClick={handleSaveUserEdit} className="text-emerald-600 p-1"><CheckCircle2 className="w-5 h-5"/></button><button onClick={() => setEditingUserId(null)} className="text-red-500 p-1"><X className="w-5 h-5"/></button></div>) : (<div className="flex gap-3"><button onClick={() => handleEditUser(u)} className="text-gray-400 hover:text-emerald-600" title="Bearbeiten"><Edit2 className="w-4 h-4"/></button><button onClick={() => handleDeleteUser(u.id)} className="text-gray-400 hover:text-red-600" title="Benutzer löschen"><Trash2 className="w-4 h-4"/></button></div>)}</td></tr>))}</tbody></table></div></div>)}</div></div></div>)}
      </main>
    </div>
  );
};

export default App;
