(function () {
  function CardHelper() {}

  CardHelper.isInteractiveTarget = function (target) {
    if (!target || !target.closest) return false;
    return Boolean(target.closest("a,button"));
  };

  window.CardHelper = CardHelper;
})();
