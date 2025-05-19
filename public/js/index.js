const POKE_API = 'https://pokeapi.co/api/v2/pokemon?limit=151';
let gamePairs = 3;

let timerInterval = null;
let timeLeft = 60;
let totalPairs = 0;
let matchedPairs = 0;
let clickCount = 0;
let powerUpUsed = false;

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function fetchRandomPokemonPairs(pairCount, callback) {
  const getValidPairs = () => {
    $.getJSON(POKE_API, (data) => {
      const allPokemon = data.results;
      const selected = [];

      while (selected.length < pairCount + 10) {
        const index = getRandomInt(allPokemon.length);
        const pokemon = allPokemon[index];
        if (!selected.some(p => p.name === pokemon.name)) {
          selected.push(pokemon);
        }
      }

      const fetches = selected.map(p => $.getJSON(p.url));
      Promise.all(fetches).then(responses => {
        const tryLoadImages = responses.map(p => {
          const imgUrl = p.sprites.other['official-artwork']?.front_default;
          return new Promise((resolve) => {
            if (!imgUrl) return resolve(null);
            const img = new Image();
            img.onload = () => resolve({ name: p.name, img: imgUrl });
            img.onerror = () => resolve(null);
            img.src = imgUrl;
          });
        });

        Promise.all(tryLoadImages).then(valid => {
          const filtered = valid.filter(Boolean).slice(0, pairCount);
          if (filtered.length < pairCount) return getValidPairs();
          const duplicated = shuffle([...filtered, ...filtered]);
          callback(duplicated);
        });
      });
    });
  };

  getValidPairs();
}

function renderCards(cards) {
  const grid = $('#game_grid');
  grid.empty();

  cards.forEach((poke) => {
    const card = $(`
      <div class="card" data-name="${poke.name}">
        <img class="front_face" src="${poke.img}" alt="${poke.name}">
        <img class="back_face" src="/images/back.webp" alt="Back">
      </div>
    `);
    grid.append(card);
  });

  setupFlipLogic();
}

function setupFlipLogic() {
  let first = null;
  let second = null;
  let lock = false;

  $('.card').off('click').on('click', function () {
    if (lock || $(this).hasClass('matched') || $(this).hasClass('flipped')) return;

    clickCount++;
    updateStatsDisplay();

    $(this).addClass('flipped');

    if (!first) {
      first = $(this);
    } else {
      second = $(this);
      lock = true;

      if (first.data('name') === second.data('name')) {
        first.addClass('matched');
        second.addClass('matched');
        matchedPairs++;

        if (matchedPairs === totalPairs) {
          clearInterval(timerInterval);
          showMessage("🎉 You Win!");
          disableAllCards();
        }

        updateStatsDisplay();
        reset();
      } else {
        setTimeout(() => {
          first.removeClass('flipped');
          second.removeClass('flipped');
          reset();
        }, 1000);
      }
    }

    function reset() {
      first = null;
      second = null;
      lock = false;
    }
  });
}

function setGridColumns(pairCount) {
  const grid = $('#game_grid');

  if (pairCount === 3) {
    grid.css('grid-template-columns', 'repeat(3, 1fr)');
    grid.css('max-width', '420px');
  } else if (pairCount === 6) {
    grid.css('grid-template-columns', 'repeat(4, 1fr)');
    grid.css('max-width', '560px');
  } else {
    grid.css('grid-template-columns', 'repeat(5, 1fr)');
    grid.css('max-width', '700px');
  }
}

function startTimer(seconds) {
  clearInterval(timerInterval);
  timeLeft = seconds;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showMessage("⏱️ Time's up! Game Over.");
      disableAllCards();
    }
  }, 1000);
}

function updateTimerDisplay() {
  $('#timer').text(`Time Left: ${timeLeft}s`);
}

function updateStatsDisplay() {
  $('#click_count').text(clickCount);
  $('#matched_count').text(matchedPairs);
  $('#total_pairs').text(totalPairs);
}

function showMessage(text) {
  $('#game_message').text(text);
}

function disableAllCards() {
  $('.card').off('click');
}

$(document).ready(() => {
  $('.difficulty').on('click', function () {
    gamePairs = parseInt($(this).data('pairs'));
    $('.difficulty').removeClass('active');
    $(this).addClass('active');
  });

  $('#startBtn').on('click', () => {
    $('#difficulty_controls').addClass('d-none');
    $('#startBtn').addClass('d-none');
    $('#resetBtn').removeClass('d-none');
    $('#powerUpBtn').removeClass('d-none').prop('disabled', false);

    $('#game_grid').css('border', '2px tomato solid').show();
    showMessage('');
    matchedPairs = 0;
    clickCount = 0;
    totalPairs = gamePairs;
    powerUpUsed = false;
    updateStatsDisplay();

    setGridColumns(gamePairs);

    let seconds = 60;
    if (gamePairs === 3) seconds = 30;
    else if (gamePairs === 6) seconds = 60;
    else seconds = 90;

    startTimer(seconds);
    fetchRandomPokemonPairs(gamePairs, renderCards);
  });

  $('#resetBtn').on('click', () => {
    clearInterval(timerInterval);
    $('#game_grid').empty().hide();
    showMessage('');
    $('#timer').text('0s');
    clickCount = 0;
    matchedPairs = 0;
    totalPairs = 0;
    powerUpUsed = false;
    updateStatsDisplay();

    $('#difficulty_controls').removeClass('d-none');
    $('#startBtn').removeClass('d-none');
    $('#resetBtn').addClass('d-none');
    $('#powerUpBtn').addClass('d-none').prop('disabled', true);
  });

  $('#powerUpBtn').on('click', () => {
    if (powerUpUsed) return;
    powerUpUsed = true;
    $('#powerUpBtn').prop('disabled', true);

    $('.card:not(.flipped)').addClass('flipped');
    disableAllCards();

    setTimeout(() => {
      $('.card').each(function () {
        if (!$(this).hasClass('matched')) {
          $(this).removeClass('flipped');
        }
      });
      setupFlipLogic();
    }, 1000); // 1 second reveal
  });

  // Light/Dark Mode Toggle
  $('#themeToggle').on('click', () => {
    $('body').toggleClass('dark-mode');
  });
});
