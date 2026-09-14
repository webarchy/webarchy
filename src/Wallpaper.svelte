<script lang="ts">
  // Tapeta pulpitu. Rysujemy ja w calosci CSS-em - kilka duzych, rozmytych plam koloru,
  // winieta i drobne ziarno - zamiast wgrywac zdjecie, i to jest swiadoma decyzja:
  //
  // - bundel zostaje maly (kilkaset bajtow zamiast megabajta JPEG-a), a apka ma byc szybka;
  // - tapeta jest ostra na kazdym ekranie, od telefonu po 5K, bez wersji @2x;
  // - kolory bierze ze zmiennych motywu, wiec jasny wariant nie potrzebuje drugiego pliku;
  // - nie wciagamy do repo cudzej licencji, co ma znaczenie, jesli szkielet ma kiedys
  //   wyjsc jako open source.
  //
  // Warstwa jest statyczna (zero animacji): nieruchoma tapeta nie kosztuje ani jednej
  // klatki, a przez rozmyte kafelki i tak widac ja tylko katem oka.
  //
  // Podmiana motywu = podmiana tego jednego pliku i zmiennych --fd-wall-* w App.svelte.
  import { applyWallpaper, readWallpaper } from "./lib/wallpapers.js"

  // Zapamietany wybor nakladamy tu, a nie w efekcie: skrypt komponentu leci synchronicznie
  // w trakcie mount(), czyli zanim przegladarka cokolwiek namaluje - inaczej tapeta
  // mrugnelaby domyslnym kolorem.
  applyWallpaper(readWallpaper())
</script>

<div class="wall" aria-hidden="true"></div>

<style>
  .wall {
    position: fixed;
    z-index: 0;
    background-color: var(--fd-wall-deep);

    /* Kolejnosc od gory: chlodna plama w lewym gornym rogu, fioletowa w prawym,
       turkusowa u dolu, druga fioletowa dla asymetrii i na koniec winieta,
       ktora sciaga wzrok do srodka ekranu. */
    background-image:
      radial-gradient(58vw 48vh at 14% -6%, var(--fd-wall-1), transparent 62%),
      radial-gradient(46vw 44vh at 88% 2%, var(--fd-wall-3), transparent 60%),
      radial-gradient(64vw 52vh at 74% 104%, var(--fd-wall-2), transparent 62%),
      radial-gradient(38vw 36vh at 28% 88%, var(--fd-wall-3), transparent 66%),
      radial-gradient(122% 120% at 50% 42%, transparent 34%, var(--fd-wall-vignette) 100%);
    inset: 0;
    pointer-events: none;
  }

  /* Warstwa obrazka, gdy wybrana tapeta go ma (--fd-wall-image). Lezy nad plamami
     koloru, wiec zanim sie dociagnie - albo gdy w ogole nie wstanie - widac pod nia
     zwykla tapete CSS-owa w tej samej palecie, a nie czarna dziure. */
  .wall::before {
    content: "";
    position: absolute;
    background-image: var(--fd-wall-image, none);
    background-position: center;
    background-size: cover;
    inset: 0;
  }

  /* Ziarno: sam szum z feTurbulence w data URI (~300 B). Bez niego gradienty na duzym
     ekranie robia widoczne pasy (banding) - ziarno je rozbija. */
  .wall::after {
    content: "";
    position: absolute;
    opacity: var(--fd-grain);
    background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='160'%20height='160'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.85'%20numOctaves='3'%20stitchTiles='stitch'/%3E%3C/filter%3E%3Crect%20width='160'%20height='160'%20filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 160px 160px;
    inset: 0;
    mix-blend-mode: overlay;
  }
</style>
