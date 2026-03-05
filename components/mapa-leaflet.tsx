'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Map, MapPin, Navigation, Maximize2, Loader2, Home, Truck, Bike, Car } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Destino {
  latitude: number;
  longitude: number;
  endereco: string;
  nomeRecebedor?: string;
}

interface MapaLeafletProps {
  origem: {
    latitude: number;
    longitude: number;
    endereco: string;
  };
  destinos: Destino[];
  tipoVeiculo?: string;
  distanciaTotal?: number;
  tempoEstimado?: number;
  altura?: string;
}

// Buscar rota real pelas ruas usando OSRM (Open Source Routing Machine) - gratuito
async function buscarRotaReal(waypoints: Array<{ lat: number, lon: number }>): Promise<L.LatLngTuple[] | null> {
  try {
    if (waypoints.length < 2) return null;

    // OSRM espera formato: lon,lat;lon,lat;...
    const coords = waypoints.map(w => `${w.lon},${w.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    // Extrair coordenadas da rota
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const geometry = data.routes[0].geometry;
      if (geometry.type === 'LineString') {
        return geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as L.LatLngTuple);
      }
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar rota:', error);
    return null;
  }
}

// Componente interno do mapa (para evitar SSR)
function MapaInterno({
  origem,
  destinos,
  containerId,
  altura = '300px'
}: {
  origem: MapaLeafletProps['origem'];
  destinos: Destino[];
  containerId: string;
  altura?: string;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Limpar mapa anterior se existir
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    // Criar icones personalizados
    const createIcon = (color: string, label?: string) => {
      const svgHouse = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

      const html = label
        ? '<div style="background-color: ' + color + '; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">' + label + '</div>'
        : '<div style="background-color: ' + color + '; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">' + svgHouse + '</div>';

      return L.divIcon({
        html,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });
    };

    // Calcular centro e bounds
    const allPoints = [origem, ...destinos];
    const bounds = L.latLngBounds(allPoints.map(p => [p.latitude, p.longitude]));

    // Criar mapa
    const map = L.map(containerId, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Adicionar tile layer CartoDB Positron (mapa minimalista, apenas ruas)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Ajustar view para mostrar todos os pontos
    map.fitBounds(bounds, { padding: [30, 30] });

    // Adicionar marcador de origem
    const origemMarker = L.marker([origem.latitude, origem.longitude], {
      icon: createIcon('#16a34a'),
    }).addTo(map);
    origemMarker.bindPopup('<strong>Origem</strong><br/>' + origem.endereco);

    // Adicionar marcadores de destino
    destinos.forEach((destino, index) => {
      const marker = L.marker([destino.latitude, destino.longitude], {
        icon: createIcon('#dc2626', String(index + 1)),
      }).addTo(map);
      marker.bindPopup('<strong>Entrega ' + (index + 1) + '</strong><br/>' + (destino.nomeRecebedor || '') + '<br/>' + destino.endereco);
    });

    // Buscar e desenhar rota real pelas ruas
    const waypoints = [
      { lat: origem.latitude, lon: origem.longitude },
      ...destinos.map(d => ({ lat: d.latitude, lon: d.longitude }))
    ];

    // Desenhar linha reta temporaria enquanto carrega a rota real
    const fallbackPoints: L.LatLngTuple[] = [
      [origem.latitude, origem.longitude],
      ...destinos.map(d => [d.latitude, d.longitude] as L.LatLngTuple),
    ];

    const tempLine = L.polyline(fallbackPoints, {
      color: '#dc2626',
      weight: 3,
      opacity: 0.4,
      dashArray: '10, 10',
    }).addTo(map);

    // Buscar rota real
    buscarRotaReal(waypoints).then(rotaReal => {
      if (rotaReal && rotaReal.length > 0 && mapRef.current) {
        // Remover linha temporaria
        map.removeLayer(tempLine);

        // Desenhar rota real
        L.polyline(rotaReal, {
          color: '#dc2626',
          weight: 4,
          opacity: 0.8,
        }).addTo(map);
      }
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mounted, origem, destinos, containerId]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center bg-muted relative z-0" style={{ height: altura }}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <div id={containerId} className="relative z-0" style={{ height: altura, width: '100%' }} />;
}

export function MapaLeaflet({
  origem,
  destinos,
  tipoVeiculo,
  distanciaTotal,
  tempoEstimado,
  altura = '300px'
}: MapaLeafletProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const mapId = useRef('map-' + Math.random().toString(36).substr(2, 9));
  const modalMapId = useRef('modal-map-' + Math.random().toString(36).substr(2, 9));

  const getVeiculoIcon = () => {
    switch (tipoVeiculo) {
      case 'LALAGO': return <Bike className="w-4 h-4" />;
      case 'CAR': return <Car className="w-4 h-4" />;
      case 'VAN': return <Truck className="w-4 h-4" />;
      default: return <Truck className="w-4 h-4" />;
    }
  };

  const getVeiculoNome = () => {
    switch (tipoVeiculo) {
      case 'LALAGO': return 'Moto';
      case 'CAR': return 'Carro';
      case 'VAN': return 'Van';
      default: return tipoVeiculo || 'Veiculo';
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              Mapa da Rota
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalAberto(true)}
              className="h-7 text-xs"
            >
              <Maximize2 className="w-3 h-3 mr-1" />
              Ampliar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <MapaInterno
            origem={origem}
            destinos={destinos}
            containerId={mapId.current}
            altura={altura}
          />

          {/* Info da rota */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {tipoVeiculo && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {getVeiculoIcon()}
                  {getVeiculoNome()}
                </Badge>
              )}
              {distanciaTotal && (
                <Badge variant="secondary">
                  <Navigation className="w-3 h-3 mr-1" />
                  {distanciaTotal.toFixed(1)} km
                </Badge>
              )}
              {tempoEstimado && (
                <Badge variant="secondary">
                  {tempoEstimado} min
                </Badge>
              )}
              <Badge variant="outline">
                {destinos.length} {destinos.length === 1 ? 'entrega' : 'entregas'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal ampliado */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Map className="w-5 h-5 text-primary" />
              Mapa da Rota
            </DialogTitle>
            <DialogDescription>
              Visualizacao ampliada da rota de entrega com origem e destinos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mapa grande */}
            <div className="rounded-lg overflow-hidden border">
              {modalAberto && (
                <MapaInterno
                  origem={origem}
                  destinos={destinos}
                  containerId={modalMapId.current}
                  altura="400px"
                />
              )}
            </div>

            {/* Detalhes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Origem */}
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-1">
                  <Home className="w-4 h-4" />
                  Origem
                </div>
                <p className="text-sm text-muted-foreground">{origem.endereco}</p>
              </div>

              {/* Destinos */}
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium mb-1">
                  <MapPin className="w-4 h-4" />
                  {destinos.length} {destinos.length === 1 ? 'Destino' : 'Destinos'}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {destinos.map((d, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      <span className="font-medium">{i + 1}.</span> {d.nomeRecebedor || d.endereco}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2">
              {tipoVeiculo && (
                <Badge className="flex items-center gap-1">
                  {getVeiculoIcon()}
                  {getVeiculoNome()}
                </Badge>
              )}
              {distanciaTotal && (
                <Badge variant="secondary">
                  <Navigation className="w-3 h-3 mr-1" />
                  {distanciaTotal.toFixed(1)} km
                </Badge>
              )}
              {tempoEstimado && (
                <Badge variant="secondary">
                  {tempoEstimado} min estimados
                </Badge>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MapaLeaflet;
