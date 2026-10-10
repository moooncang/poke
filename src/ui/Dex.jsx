import { useState } from 'react';
import { Heart, Search } from 'lucide-react';
import { POKEMON, sprite } from './assets.js';
import { PokeBall } from './common.jsx';

export function Dex({ life, onPokemon }) {
  const [query, setQuery] = useState('');
  const creatures = life.seen.map(id => POKEMON[id]).filter(p => p && (p.name.includes(query) || String(p.id).includes(query)));
  const status = id => life.party.some(m => m.id === id) ? '동행 중' : life.box.some(m => m.id === id) ? '박스' : null;
  return <section className="collection-content">
    <div className="content-title"><div><span className="eyebrow">POKÉDEX DATABASE</span><h2>포켓몬 도감</h2><p>관측한 포켓몬의 타입과 도감 정보를 확인합니다.</p></div><span className="count-badge">{life.seen.length}종</span></div>
    <label className="search-field"><Search size={17}/><input placeholder="이름이나 도감 번호로 찾기" value={query} onChange={e => setQuery(e.target.value)} aria-label="만난 포켓몬 검색"/></label>
    {creatures.length ? <div className="dex-grid">{creatures.map(p => <button className="dex-card" key={p.id} onClick={() => onPokemon(p.id)}>
      <small>No. {String(p.id).padStart(4, '0')}</small><img src={sprite(p.id)} className="pixel" alt=""/><h3>{p.name}</h3><span>{p.types.join(' · ')}</span>
      {status(p.id) && <span className="dex-companion"><Heart size={10}/> {status(p.id)}</span>}
    </button>)}</div>
    : <div className="empty-state"><PokeBall/><h3>{query ? '아직 그 친구를 만나지 못했어요' : '첫 만남은 언제 찾아올까요?'}</h3><p>{query ? '다른 이름으로 찾아보세요.' : '이야기를 이어가면 만난 포켓몬이 이곳에 기록됩니다.'}</p></div>}
  </section>;
}
