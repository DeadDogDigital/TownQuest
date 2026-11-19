import {mapLocations} from './map-data.js';

const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderTrailMap(stops){
  const element = document.getElementById('trail-map');
  if(!element) return;
  if(!window.L){
    element.innerHTML = '<p class="map-fallback">The map could not load just now. The numbered windows are listed below by chapter.</p>';
    return;
  }
  const map = L.map(element, {scrollWheelZoom:false}).setView([54.9721,-2.1022],17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:20,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  const bounds = [];
  stops.forEach(stop => {
    const location = mapLocations[stop.id];
    if(!location) return;
    const point = [location.lat,location.lng];
    bounds.push(point);
    const icon = L.divIcon({
      className:'trail-map-marker-wrap',
      html:'<span class="trail-map-marker">'+String(stop.id).padStart(2,'0')+'</span>',
      iconSize:[34,34],
      iconAnchor:[17,17]
    });
    const marker = L.marker(point,{icon}).addTo(map);
    const popup = document.createElement('div');
    popup.className='trail-map-popup';
    const title = document.createElement('strong');
    title.textContent = String(stop.id).padStart(2,'0')+' · '+stop.shop;
    const address = document.createElement('span');
    address.textContent = location.address;
    const link = document.createElement('a');
    link.href='/trail/'+String(stop.id).padStart(2,'0');
    link.textContent='View this window';
    const directions = document.createElement('a');
    directions.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(location.address+', Northumberland, UK');
    directions.target='_blank';
    directions.rel='noopener';
    directions.textContent='Directions';
    popup.append(title,address,link,directions);
    marker.bindPopup(popup);
    marker.on('click',()=>{});
  });
  if(bounds.length) map.fitBounds(bounds,{padding:[24,24],maxZoom:17});
  setTimeout(()=>map.invalidateSize(),120);
}
